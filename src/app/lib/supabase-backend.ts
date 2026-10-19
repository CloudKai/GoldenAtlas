import type { User } from "@supabase/supabase-js";
import { CITY_OPTIONS } from "../data/city-visits";
import type { AppState, AppUser, Trip } from "../types/domain";
import type { AtlasBackend, AtlasSession, SaveProgress } from "./backend";
import { runPool, withRetry } from "./async-pool";
import { getCountry } from "../data/countries";
import { isUntouchedRow, preferencesFromRow, rowPatchFromPreferences } from "./preferences-sync";
import type { PhotoAsset } from "./local-repository";
import { getSupabase, type AtlasClient } from "./supabase";
import {
  SIGNED_URL_SECONDS, OFFLINE_MESSAGE, GENERIC_MESSAGE,
  companionNames, describeAuthError, describeDatabaseError, describeFunctionError, memoryUpdate, passwordProblem,
  placesToRows, planPhotoChanges, sortTrips, tripFromRow, tripToRow, validateRemoteTrip,
  type ErrorLike, type MediaUrls, type MemoryRow, type PlaceRow, type TripDayRow, type TripRow,
} from "./supabase-mappers";
import { planDaySync, tripDays } from "./trip-days";

const PAGE_SIZE = 500;
const SIGN_BATCH = 100;
const SIGN_PARALLEL = 4;
const UPLOAD_PARALLEL = 3;
const ORIGINAL_BUCKET = "travel-memories";
const THUMBNAIL_BUCKET = "travel-thumbnails";
const favouriteKey = (userId: string) => `golden-atlas:favourite-country:${userId}`;
const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const dbError = (error: ErrorLike) => new Error(describeDatabaseError(error));
const authError = (error: ErrorLike) => new Error(describeAuthError(error));
const redirect = (path: string) => `${window.location.origin}${path}`;

interface MemoryPaths { original: string; thumbnail: string }

export function createSupabaseBackend(): AtlasBackend {
  const sb: AtlasClient = getSupabase();
  const countryNames = new Map<string, string>();
  const pathIndex = new Map<string, MemoryPaths>();

  // --- generic helpers -----------------------------------------------------

  async function fetchAll<T>(page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: ErrorLike | null }>) {
    const rows: T[] = [];
    for (let from = 0; ; from += PAGE_SIZE) {
      const { data, error } = await page(from, from + PAGE_SIZE - 1);
      if (error) throw dbError(error);
      rows.push(...(data ?? []));
      if (!data || data.length < PAGE_SIZE) return rows;
    }
  }

  async function callFunction<T>(name: string, body: Record<string, unknown>): Promise<T> {
    const { data, error } = await sb.functions.invoke(name, { body });
    if (error) throw new Error(await functionFailureMessage(error));
    const payload = data as { data?: T; error?: { code?: string; message?: string } } | null;
    if (!payload || payload.error || payload.data === undefined) throw new Error(describeFunctionError(payload?.error?.code, payload?.error?.message));
    return payload.data;
  }

  async function functionFailureMessage(error: unknown) {
    const failure = error as { name?: string; message?: string; context?: unknown };
    if (failure.name === "FunctionsFetchError" || /failed to fetch/i.test(failure.message ?? "")) return OFFLINE_MESSAGE;
    const context = failure.context;
    if (typeof Response !== "undefined" && context instanceof Response) {
      try {
        const body = await context.clone().json() as { error?: { code?: string; message?: string } };
        if (body?.error?.code) return describeFunctionError(body.error.code, body.error.message);
      } catch { /* fall through to status handling */ }
      if (context.status === 401) return describeFunctionError("AUTH_REQUIRED");
    }
    return GENERIC_MESSAGE;
  }

  // --- reference data ------------------------------------------------------

  async function loadCountries() {
    if (countryNames.size) return;
    const rows = await fetchAll<{ iso_code: string; name: string }>((from, to) =>
      sb.from("countries").select("iso_code,name").eq("is_active", true).order("iso_code").range(from, to));
    rows.forEach((row) => countryNames.set(row.iso_code, row.name));
  }

  // --- private media -------------------------------------------------------

  async function signPaths(bucket: string, paths: string[]) {
    const signed = new Map<string, string>();
    const batches: string[][] = [];
    for (let index = 0; index < paths.length; index += SIGN_BATCH) batches.push(paths.slice(index, index + SIGN_BATCH));
    await runPool(batches, SIGN_PARALLEL, async (batch) => {
      const { data, error } = await sb.storage.from(bucket).createSignedUrls(batch, SIGNED_URL_SECONDS);
      if (error || !data) return; // Images fail soft; metadata still renders and the next refresh retries.
      data.forEach((item) => { if (item.path && item.signedUrl) signed.set(item.path, item.signedUrl); });
    });
    return signed;
  }

  /**
   * Thumbnails are all a grid needs, so they are signed first and the app opens quickly; originals follow in the
   * background. Until an original is ready the thumbnail stands in for it.
   */
  async function signMemories(memories: Array<Pick<MemoryRow, "id" | "original_path" | "thumbnail_path">>, scope: "thumbnails" | "originals" | "all" = "all") {
    memories.forEach((memory) => pathIndex.set(memory.id, { original: memory.original_path, thumbnail: memory.thumbnail_path }));
    const [originals, thumbnails] = await Promise.all([
      scope === "thumbnails" ? new Map<string, string>() : signPaths(ORIGINAL_BUCKET, memories.map((memory) => memory.original_path)),
      scope === "originals" ? new Map<string, string>() : signPaths(THUMBNAIL_BUCKET, memories.map((memory) => memory.thumbnail_path)),
    ]);
    return new Map<string, MediaUrls>(memories.map((memory): [string, MediaUrls] => {
      const original = originals.get(memory.original_path);
      const thumbnail = thumbnails.get(memory.thumbnail_path);
      if (scope === "thumbnails") return [memory.id, { url: thumbnail, thumbnailUrl: thumbnail }];
      if (scope === "originals") return [memory.id, { url: original }];
      return [memory.id, { url: original, thumbnailUrl: thumbnail }];
    }));
  }

  // --- loading -------------------------------------------------------------

  async function loadTrips(tripIds?: string[]): Promise<Trip[]> {
    if (tripIds && !tripIds.length) return [];
    await loadCountries();
    const [tripRows, memoryRows, placeRows, dayRows, companionRows] = await Promise.all([
      fetchAll<TripRow>((from, to) => {
        const query = sb.from("trips").select("*");
        return (tripIds ? query.in("id", tripIds) : query).order("start_date", { ascending: false }).order("id", { ascending: false }).range(from, to);
      }),
      fetchAll<MemoryRow>((from, to) => {
        const query = sb.from("memories").select("*").eq("upload_status", "ready");
        return (tripIds ? query.in("trip_id", tripIds) : query).order("trip_id").order("display_order").order("id").range(from, to);
      }),
      fetchAll<PlaceRow>((from, to) => {
        const query = sb.from("places").select("*");
        return (tripIds ? query.in("trip_id", tripIds) : query).order("trip_id").order("name").order("id").range(from, to);
      }),
      fetchAll<TripDayRow>((from, to) => {
        const query = sb.from("trip_days").select("*");
        return (tripIds ? query.in("trip_id", tripIds) : query).order("trip_id").order("day_date").range(from, to);
      }),
      fetchAll<{ trip_id: string; travel_companions: { display_name: string } | null }>((from, to) => {
        const query = sb.from("trip_companions").select("trip_id,travel_companions(display_name)");
        return (tripIds ? query.in("trip_id", tripIds) : query).order("trip_id").order("companion_id").range(from, to);
      }),
    ]);

    const urls = await signMemories(memoryRows, "thumbnails");
    const group = <T extends { trip_id: string }>(rows: T[]) => rows.reduce((map, row) => map.set(row.trip_id, [...(map.get(row.trip_id) ?? []), row]), new Map<string, T[]>());
    const memoriesByTrip = group(memoryRows);
    const placesByTrip = group(placeRows);
    const daysByTrip = group(dayRows);
    const companionsByTrip = group(companionRows);

    return tripRows.map((row) => tripFromRow(row, {
      countryName: (code) => countryNames.get(code) ?? code,
      memories: memoriesByTrip.get(row.id) ?? [],
      places: placesByTrip.get(row.id) ?? [],
      days: daysByTrip.get(row.id) ?? [],
      companions: (companionsByTrip.get(row.id) ?? []).map((item) => item.travel_companions?.display_name ?? "").filter(Boolean).sort((a, b) => a.localeCompare(b)),
      urls,
      cities: CITY_OPTIONS,
    }));
  }

  async function loadState(userId: string, favouriteCountryId?: string): Promise<AppState> {
    const [trips, bucket] = await Promise.all([
      loadTrips(),
      fetchAll<{ country_code: string }>((from, to) => sb.from("bucket_list").select("country_code").order("country_code").range(from, to)),
    ]);
    return {
      schemaVersion: 1,
      userId,
      trips,
      bucketListIds: bucket.map((row) => row.country_code),
      favouriteCountryId,
      updatedAt: new Date().toISOString(),
    };
  }

  async function loadUser(authUser: User): Promise<AppUser> {
    const { data, error } = await sb.from("profiles").select("display_name").eq("id", authUser.id).maybeSingle();
    if (error) throw dbError(error);
    let name = data?.display_name?.trim() ?? "";
    const signupName = typeof authUser.user_metadata?.display_name === "string" ? authUser.user_metadata.display_name.trim().slice(0, 80) : "";
    if (!name && signupName) {
      // The profile row is created by a database trigger; apply the name chosen at sign-up on first sign-in.
      const update = await sb.from("profiles").update({ display_name: signupName }).eq("id", authUser.id);
      if (!update.error) name = signupName;
    }
    const email = authUser.email ?? "";
    return { id: authUser.id, name: name || email.split("@")[0] || "Traveller", email, isDemo: false, createdAt: authUser.created_at };
  }

  let currentUserId = "";

  async function openSession(authUser: User): Promise<AtlasSession> {
    const user = await loadUser(authUser);
    currentUserId = user.id;
    // Settings must never stop the atlas from opening, so a failed read just means defaults for now.
    const preferenceRow = await sb.from("user_preferences").select("*").eq("user_id", user.id).maybeSingle().then((result) => result.data, () => null);
    let favourite = getCountry(preferenceRow?.favourite_country_code)?.id;

    // Earlier versions kept the favourite country on the device only; move it to the account once.
    const legacy = localStorage.getItem(favouriteKey(user.id));
    if (legacy) {
      const legacyId = getCountry(legacy)?.id;
      if (!favourite && legacyId) {
        const moved = await sb.from("user_preferences").update({ favourite_country_code: legacyId }).eq("user_id", user.id);
        if (!moved.error) favourite = legacyId;
      }
      if (favourite) localStorage.removeItem(favouriteKey(user.id));
    }

    return {
      user,
      state: await loadState(user.id, favourite),
      preferences: preferenceRow ? { values: preferencesFromRow(preferenceRow), untouched: isUntouchedRow(preferenceRow) } : undefined,
    };
  }

  function clearCaches() {
    pathIndex.clear();
    countryNames.clear();
    currentUserId = "";
  }

  // --- trip persistence ----------------------------------------------------

  async function syncPlaces(trip: Trip) {
    const removed = await sb.from("places").delete().eq("trip_id", trip.id);
    if (removed.error) throw dbError(removed.error);
    const rows = placesToRows(trip).map((row) => ({ ...row, trip_id: trip.id }));
    if (!rows.length) return;
    const inserted = await sb.from("places").insert(rows);
    if (inserted.error) throw dbError(inserted.error);
  }

  async function syncDays(existing: Trip["days"], trip: Trip) {
    const plan = planDaySync(existing ?? [], tripDays(trip));
    if (plan.toUpsert.length) {
      const saved = await sb.from("trip_days").upsert(
        plan.toUpsert.map((day) => ({ trip_id: trip.id, day_date: day.date, title: day.title?.trim() || null, notes: day.notes || null, places: day.places ?? [] })),
        { onConflict: "trip_id,day_date" },
      );
      if (saved.error) throw dbError(saved.error);
    }
    if (plan.toDelete.length) {
      const removed = await sb.from("trip_days").delete().eq("trip_id", trip.id).in("day_date", plan.toDelete);
      if (removed.error) throw dbError(removed.error);
    }
  }

  async function syncCompanions(trip: Trip) {
    const removed = await sb.from("trip_companions").delete().eq("trip_id", trip.id);
    if (removed.error) throw dbError(removed.error);
    for (const name of companionNames(trip)) {
      const found = await sb.from("travel_companions").select("id").eq("display_name", name).limit(1).maybeSingle();
      if (found.error) throw dbError(found.error);
      let companionId = found.data?.id;
      if (!companionId) {
        const created = await sb.from("travel_companions").insert({ display_name: name }).select("id").single();
        if (created.error) throw dbError(created.error);
        companionId = created.data.id;
      }
      const joined = await sb.from("trip_companions").insert({ trip_id: trip.id, companion_id: companionId });
      if (joined.error) throw dbError(joined.error);
    }
  }

  /** Uploads one object, retrying transient failures. "Already exists" means an earlier attempt landed, which is fine. */
  async function putObject(bucket: string, path: string, body: Blob) {
    await withRetry(async () => {
      const { error } = await sb.storage.from(bucket).upload(path, body, { contentType: "image/jpeg", cacheControl: "0", upsert: false });
      if (!error) return;
      const detail = error as { statusCode?: string | number; message?: string };
      if (String(detail.statusCode) === "409" || /already exists|duplicate/i.test(detail.message ?? "")) return;
      throw error;
    }, { attempts: 3, delayMs: 500 });
  }

  async function uploadMemory(tripId: string, photo: Trip["photos"][number], order: number, asset: PhotoAsset) {
    const pending = await sb.from("memories").insert({
      id: photo.id,
      trip_id: tripId,
      ...memoryUpdate(photo, order),
      original_mime_type: "image/jpeg",
      declared_size_bytes: asset.original.size,
      declared_thumbnail_size_bytes: asset.thumbnail.size,
      width: asset.width ?? null,
      height: asset.height ?? null,
    }).select("id,original_path,thumbnail_path").single();
    if (pending.error) throw dbError(pending.error);
    try {
      await putObject(ORIGINAL_BUCKET, pending.data.original_path, asset.original);
      await putObject(THUMBNAIL_BUCKET, pending.data.thumbnail_path, asset.thumbnail);
      // Finalizing is idempotent, so a dropped response can safely be retried.
      await withRetry(() => callFunction("finalize-memory-upload", { memory_id: photo.id }), { attempts: 2, delayMs: 500 });
    } catch (failure) {
      // Remove the half-finished record and any uploaded object; the abandoned-upload worker is the safety net.
      await callFunction("delete-memory", { memory_id: photo.id }).catch(() => undefined);
      throw failure;
    }
  }

  async function syncPhotos(existing: Trip["photos"], trip: Trip, assets: PhotoAsset[], onProgress?: (progress: SaveProgress) => void) {
    const assetById = new Map(assets.map((asset) => [asset.id, asset]));
    const plan = planPhotoChanges(existing, trip.photos, new Set(assetById.keys()));
    const failures: string[] = [];

    for (const id of plan.toDelete) {
      try { await callFunction("delete-memory", { memory_id: id }); } catch { failures.push("remove"); }
    }
    for (const { photo, order } of plan.toUpdate) {
      const updated = await sb.from("memories").update(memoryUpdate(photo, order)).eq("id", photo.id);
      if (updated.error) failures.push("update");
    }
    // A few uploads at a time: faster than one by one, gentler on a weak connection than all at once.
    const failedPhotoIds: string[] = [];
    const total = plan.toInsert.length;
    let done = 0;
    if (total) onProgress?.({ stage: "photos", done, total });
    const uploads = await runPool(plan.toInsert, UPLOAD_PARALLEL, async ({ photo, order }) => {
      try { await uploadMemory(trip.id, photo, order, assetById.get(photo.id)!); }
      finally { done += 1; onProgress?.({ stage: "photos", done, total }); }
    });
    uploads.forEach((result, index) => {
      if (result.ok) return;
      failures.push("upload");
      failedPhotoIds.push(plan.toInsert[index].photo.id);
    });

    const count = (kind: string) => failures.filter((item) => item === kind).length;
    const warnings: string[] = [];
    if (count("upload")) warnings.push(`${count("upload")} ${count("upload") === 1 ? "photo" : "photos"} couldn’t be uploaded. Your trip is saved; use Retry on the trip page to try ${count("upload") === 1 ? "it" : "them"} again.`);
    if (count("remove")) warnings.push(`${count("remove")} ${count("remove") === 1 ? "photo" : "photos"} couldn’t be removed yet. Try again from Edit trip.`);
    if (count("update")) warnings.push(`${count("update")} photo ${count("update") === 1 ? "change" : "changes"} couldn’t be saved. Try again from Edit trip.`);
    return { warnings, failedPhotoIds };
  }

  // --- backend contract ----------------------------------------------------

  return {
    kind: "supabase",

    async init() {
      const { data, error } = await sb.auth.getSession();
      if (error) throw authError(error);
      return data.session?.user ? openSession(data.session.user) : null;
    },

    onSignedOut(listener) {
      const { data } = sb.auth.onAuthStateChange((event) => { if (event === "SIGNED_OUT") listener(); });
      return () => data.subscription.unsubscribe();
    },

    async register(name, email, password) {
      const problem = passwordProblem(password);
      if (problem) throw new Error(problem);
      const normalized = email.trim().toLowerCase();
      const { data, error } = await sb.auth.signUp({
        email: normalized,
        password,
        options: { data: { display_name: name.trim().slice(0, 80) }, emailRedirectTo: redirect("/auth/callback") },
      });
      if (error) throw authError(error);
      // With email confirmation on (the default) no session exists until the link is opened. An existing address is
      // reported identically so the form cannot be used to discover registered emails.
      if (!data.session || !data.user) return { status: "verify-email", email: normalized };
      return { status: "signed-in", session: await openSession(data.user) };
    },

    async signIn(email, password) {
      const { data, error } = await sb.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
      if (error) throw authError(error);
      return openSession(data.user);
    },

    async signOut() {
      clearCaches();
      await sb.auth.signOut({ scope: "local" }); // This device only; other signed-in devices stay signed in.
    },

    async requestPasswordReset(email) {
      const { error } = await sb.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo: redirect("/auth/reset-password") });
      if (error) throw authError(error);
    },

    async completePasswordReset(newPassword) {
      const problem = passwordProblem(newPassword);
      if (problem) throw new Error(problem);
      const { error } = await sb.auth.updateUser({ password: newPassword });
      if (error) throw authError(error);
    },

    async saveTrip(state, trip, assets, onProgress) {
      onProgress?.({ stage: "details", done: 0, total: 0 });
      const problems = validateRemoteTrip(trip);
      if (problems.length) throw new Error(problems.join(" "));
      const existing = state.trips.find((item) => item.id === trip.id);
      const { country_code, ...changes } = tripToRow(trip);

      if (existing) {
        const updated = await sb.from("trips").update(changes).eq("id", trip.id).select("id");
        if (updated.error) throw dbError(updated.error);
        if (!updated.data?.length) throw new Error(describeDatabaseError({ code: "PGRST116" }));
      } else {
        const inserted = await sb.from("trips").insert({ id: trip.id, country_code, ...changes });
        if (inserted.error?.code === "23505") {
          // An earlier attempt with this id got as far as saving the trip; carry on from there rather than failing.
          const repeated = await sb.from("trips").update(changes).eq("id", trip.id).select("id");
          if (repeated.error) throw dbError(repeated.error);
        } else if (inserted.error) throw dbError(inserted.error);
      }

      // The trip row now exists. Failures below are reported as warnings instead of errors so the UI reflects the
      // saved trip (and a retry edits it) rather than creating a duplicate.
      const warnings: string[] = [];
      try { await syncPlaces(trip); } catch { warnings.push("Cities and places couldn’t be saved. Open Edit trip to try again."); }
      try { await syncDays(existing?.days, trip); } catch { warnings.push("Some day notes couldn’t be saved. Open Edit trip to try again."); }
      try { await syncCompanions(trip); } catch { warnings.push("Travel companions couldn’t be saved. Open Edit trip to try again."); }
      const photoSync = await syncPhotos(existing?.photos ?? [], trip, assets, onProgress);
      warnings.push(...photoSync.warnings);

      const [fresh] = await loadTrips([trip.id]);
      if (!fresh) throw new Error(GENERIC_MESSAGE);
      const trips = sortTrips([...state.trips.filter((item) => item.id !== trip.id), fresh]);
      return { state: { ...state, trips, updatedAt: new Date().toISOString() }, warnings, failedPhotoIds: photoSync.failedPhotoIds };
    },

    async deleteTrip(state, tripId) {
      await callFunction("delete-trip", { trip_id: tripId });
      state.trips.find((trip) => trip.id === tripId)?.photos.forEach((photo) => pathIndex.delete(photo.id));
      return { ...state, trips: state.trips.filter((trip) => trip.id !== tripId), updatedAt: new Date().toISOString() };
    },

    async toggleTripFavourite(state, tripId) {
      const trip = state.trips.find((item) => item.id === tripId);
      if (!trip) return state;
      const { error } = await sb.from("trips").update({ is_favourite: !trip.isFavourite }).eq("id", tripId);
      if (error) throw dbError(error);
      return { ...state, trips: state.trips.map((item) => item.id === tripId ? { ...item, isFavourite: !item.isFavourite } : item) };
    },

    async togglePhotoFavourite(state, photoId) {
      const photo = state.trips.flatMap((trip) => trip.photos).find((item) => item.id === photoId);
      if (!photo) return state;
      const { error } = await sb.from("memories").update({ is_favourite: !photo.isFavourite }).eq("id", photoId);
      if (error) throw dbError(error);
      return { ...state, trips: state.trips.map((trip) => ({ ...trip, photos: trip.photos.map((item) => item.id === photoId ? { ...item, isFavourite: !item.isFavourite } : item) })) };
    },

    async toggleBucketList(state, countryId) {
      const included = state.bucketListIds.includes(countryId);
      const { error } = included
        ? await sb.from("bucket_list").delete().eq("country_code", countryId)
        : await sb.from("bucket_list").insert({ country_code: countryId });
      if (error) throw dbError(error);
      return { ...state, bucketListIds: included ? state.bucketListIds.filter((id) => id !== countryId) : [...state.bucketListIds, countryId] };
    },

    async setFavouriteCountry(state, countryId) {
      const { error } = await sb.from("user_preferences").update({ favourite_country_code: countryId ?? null }).eq("user_id", state.userId);
      if (error) throw dbError(error);
      return { ...state, favouriteCountryId: countryId };
    },

    async updateProfile(user, name, email) {
      const trimmed = name.trim();
      if (!trimmed || trimmed.length > 80) throw new Error("Enter a name of 80 characters or fewer.");
      const saved = await sb.from("profiles").update({ display_name: trimmed }).eq("id", user.id);
      if (saved.error) throw dbError(saved.error);
      let notice: string | undefined;
      if (email.trim().toLowerCase() !== user.email.toLowerCase()) {
        const { error } = await sb.auth.updateUser({ email: email.trim().toLowerCase() }, { emailRedirectTo: redirect("/auth/callback") });
        if (error) throw authError(error);
        notice = "Name saved. Confirm your new email address from the link we sent; it changes after you do.";
      }
      return { user: { ...user, name: trimmed }, notice };
    },

    async changePassword(user, currentPassword, newPassword) {
      const problem = passwordProblem(newPassword);
      if (problem) throw new Error(problem);
      const verified = await sb.auth.signInWithPassword({ email: user.email, password: currentPassword });
      if (verified.error) throw verified.error.code === "invalid_credentials" ? new Error("Current password is incorrect.") : authError(verified.error);
      const { error } = await sb.auth.updateUser({ password: newPassword });
      if (error) throw authError(error);
    },

    async deleteAccount(user, password) {
      if (!password) throw new Error("Enter your password to confirm.");
      // Deletion requires a token issued in the last 15 minutes, so re-authenticate immediately beforehand.
      const verified = await sb.auth.signInWithPassword({ email: user.email, password });
      if (verified.error) throw verified.error.code === "invalid_credentials" ? new Error("Password is incorrect.") : authError(verified.error);
      await callFunction("delete-account", { confirmation: "DELETE" });
      localStorage.removeItem(favouriteKey(user.id));
      clearCaches();
      await sb.auth.signOut({ scope: "local" }).catch(() => undefined);
    },

    async savePreferences(patch) {
      const row = rowPatchFromPreferences(patch);
      if (!Object.keys(row).length || !currentUserId) return;
      const { error } = await sb.from("user_preferences").update(row).eq("user_id", currentUserId);
      if (error) throw dbError(error);
    },

    async refreshMedia(photoIds, scope = "all") {
      const memories = photoIds.flatMap((id) => {
        const paths = pathIndex.get(id);
        return paths ? [{ id, original_path: paths.original, thumbnail_path: paths.thumbnail }] : [];
      });
      return signMemories(memories, scope);
    },

    async exportData() {
      const job = await callFunction<{ id: string; status: string }>("request-data-export", {});
      let status = job.status;
      for (let attempt = 0; status !== "completed" && attempt < 20; attempt += 1) {
        if (status === "failed" || status === "expired" || status === "cancelled") throw new Error(describeFunctionError("EXPORT_FAILED"));
        await sleep(1500);
        const { data, error } = await sb.from("data_export_jobs").select("status").eq("id", job.id).maybeSingle();
        if (error) throw dbError(error);
        if (!data) throw new Error(describeFunctionError("EXPORT_FAILED"));
        status = data.status;
      }
      if (status !== "completed") throw new Error("Your export is still being prepared. Try again in a minute.");
      const download = await callFunction<{ signed_url: string }>("get-export-download", { export_job_id: job.id });
      // The signed URL stays in memory only; it is never logged or stored.
      const response = await fetch(download.signed_url);
      if (!response.ok) throw new Error(describeFunctionError("EXPORT_EXPIRED"));
      return response.blob();
    },
  };
}
