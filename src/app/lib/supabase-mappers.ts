// Pure helpers that translate between Supabase rows and the web app's domain model.
// This module must stay free of runtime imports (types only) so it can be unit tested in Node.
import type { Tables } from "../../types/database.generated";
import type { AppState, MemoryPhoto, Trip, TripStop } from "../types/domain";

export type TripRow = Tables<"trips">;
export type MemoryRow = Tables<"memories">;
export type PlaceRow = Tables<"places">;
export type TripDayRow = Tables<"trip_days">;

export const FALLBACK_COVER = "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=900&q=80&auto=format&fit=crop";
export const SIGNED_URL_SECONDS = 600;

export interface CityRef {
  id: string;
  city: string;
  countryId: string;
  region?: string;
  latitude: number;
  longitude: number;
}

export interface MediaUrls {
  url: string;
  thumbnailUrl: string;
}

// ---------------------------------------------------------------------------
// Small value helpers
// ---------------------------------------------------------------------------

export function flagEmoji(countryCode: string) {
  const code = countryCode.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return "🌍";
  return String.fromCodePoint(...[...code].map((letter) => 0x1f1e6 + letter.charCodeAt(0) - 65));
}

export function tripDuration(startDate: string, endDate: string) {
  const start = Date.parse(`${startDate}T00:00:00Z`);
  const end = Date.parse(`${endDate}T00:00:00Z`);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 1;
  return Math.max(1, Math.round((end - start) / 86_400_000) + 1);
}

export function takenAtFromDate(date: string | undefined) {
  return date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? `${date}T12:00:00Z` : null;
}

export function dateFromTakenAt(takenAt: string | null, fallback: string) {
  return (takenAt ?? fallback).slice(0, 10);
}

const slug = (value: string) => value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

const roundCoordinate = (value: number) => Math.round(value * 1_000_000) / 1_000_000;

// ---------------------------------------------------------------------------
// Row -> domain
// ---------------------------------------------------------------------------

export function stopFromPlace(place: PlaceRow, cities: readonly CityRef[], trip: Pick<TripRow, "start_date" | "end_date">): TripStop | null {
  if (place.latitude === null || place.longitude === null) return null;
  const label = (place.city ?? place.name).trim();
  const match = cities.find((city) => city.countryId === place.country_code && city.city.toLowerCase() === label.toLowerCase());
  return {
    id: place.id,
    cityId: match?.id ?? `${place.country_code.toLowerCase()}-${slug(label) || place.id}`,
    city: match?.city ?? label,
    countryId: place.country_code,
    region: match?.region,
    latitude: Number(place.latitude),
    longitude: Number(place.longitude),
    arrivalDate: trip.start_date,
    departureDate: trip.end_date,
  };
}

export function photoFromMemory(row: MemoryRow, urls: MediaUrls | undefined): MemoryPhoto {
  return {
    id: row.id,
    url: urls?.url ?? "",
    thumbnailUrl: urls?.thumbnailUrl || urls?.url || undefined,
    caption: row.caption ?? "",
    date: dateFromTakenAt(row.taken_at, row.created_at),
    location: row.location_label ?? undefined,
    isFavourite: row.is_favourite,
    size: row.declared_size_bytes,
    mimeType: row.original_mime_type === "image/png" ? "image/png" : "image/jpeg",
  };
}

export interface TripAssembly {
  countryName: (code: string) => string;
  memories: readonly MemoryRow[];
  places: readonly PlaceRow[];
  days?: readonly TripDayRow[];
  companions: readonly string[];
  urls: ReadonlyMap<string, MediaUrls>;
  cities: readonly CityRef[];
}

export function tripFromRow(row: TripRow, assembly: TripAssembly): Trip {
  const countryName = assembly.countryName(row.country_code);
  const photos = [...assembly.memories]
    .sort((a, b) => a.display_order - b.display_order || a.id.localeCompare(b.id))
    .map((memory) => photoFromMemory(memory, assembly.urls.get(memory.id)));
  const stops = assembly.places
    .map((place) => stopFromPlace(place, assembly.cities, row))
    .filter((stop): stop is TripStop => stop !== null);
  return {
    id: row.id,
    countryId: row.country_code,
    title: row.name,
    city: row.city ?? countryName,
    country: countryName,
    countryFlag: flagEmoji(row.country_code),
    startDate: row.start_date,
    endDate: row.end_date,
    duration: tripDuration(row.start_date, row.end_date),
    coverImage: photos.find((photo) => photo.url)?.url ?? FALLBACK_COVER,
    photos,
    journal: row.journal ?? "",
    favouriteMemory: row.favourite_memory ?? undefined,
    mood: row.mood ?? "✨",
    rating: row.rating ?? 0,
    companions: [...assembly.companions],
    places: assembly.places.map((place) => place.name),
    stops,
    days: [...(assembly.days ?? [])]
      .sort((a, b) => a.day_date.localeCompare(b.day_date))
      .map((day) => ({ date: day.day_date, title: day.title ?? undefined, notes: day.notes ?? "" })),
    isFavourite: row.is_favourite,
  };
}

// ---------------------------------------------------------------------------
// Domain -> rows
// ---------------------------------------------------------------------------

export function tripToRow(trip: Trip) {
  return {
    country_code: trip.countryId,
    name: trip.title.trim(),
    city: trip.city.trim() || null,
    start_date: trip.startDate,
    end_date: trip.endDate,
    journal: trip.journal.trim() || null,
    favourite_memory: trip.favouriteMemory?.trim() || null,
    mood: trip.mood || null,
    rating: trip.rating >= 1 && trip.rating <= 5 ? Math.round(trip.rating) : null,
    is_favourite: trip.isFavourite,
  };
}

/** Stops become places with coordinates; remaining free-text places keep a name only. */
export function placesToRows(trip: Trip) {
  const stopRows = trip.stops.map((stop) => ({
    name: stop.city.trim(),
    city: stop.city.trim(),
    country_code: trip.countryId,
    latitude: roundCoordinate(stop.latitude),
    longitude: roundCoordinate(stop.longitude),
  }));
  const taken = new Set(stopRows.map((row) => row.name.toLowerCase()));
  const extra = trip.places
    .map((name) => name.trim())
    .filter((name) => {
      const key = name.toLowerCase();
      if (!name || taken.has(key)) return false;
      taken.add(key);
      return true;
    })
    .map((name) => ({ name, city: null, country_code: trip.countryId, latitude: null, longitude: null }));
  return [...stopRows, ...extra];
}

export const companionNames = (trip: Pick<Trip, "companions">) => {
  const seen = new Set<string>();
  return trip.companions.map((name) => name.trim()).filter((name) => {
    const key = name.toLowerCase();
    if (!name || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export function memoryUpdate(photo: MemoryPhoto, displayOrder: number) {
  return {
    caption: photo.caption.trim() || null,
    location_label: photo.location?.trim() || null,
    taken_at: takenAtFromDate(photo.date),
    is_favourite: photo.isFavourite,
    display_order: displayOrder,
  };
}

export interface PhotoPlan {
  toInsert: Array<{ photo: MemoryPhoto; order: number }>;
  toUpdate: Array<{ photo: MemoryPhoto; order: number }>;
  toDelete: string[];
}

/** Decides which photos to upload, update, or delete when a trip is saved. */
export function planPhotoChanges(existing: readonly MemoryPhoto[], next: readonly MemoryPhoto[], newAssetIds: ReadonlySet<string>): PhotoPlan {
  const before = new Map(existing.map((photo, index) => [photo.id, { photo, index }]));
  const plan: PhotoPlan = { toInsert: [], toUpdate: [], toDelete: [] };
  const kept = new Set<string>();
  next.forEach((photo, order) => {
    const current = before.get(photo.id);
    if (current) {
      kept.add(photo.id);
      const changed = current.photo.caption !== photo.caption
        || (current.photo.location ?? "") !== (photo.location ?? "")
        || current.photo.date !== photo.date
        || current.photo.isFavourite !== photo.isFavourite
        || current.index !== order;
      if (changed) plan.toUpdate.push({ photo, order });
    } else if (newAssetIds.has(photo.id)) {
      plan.toInsert.push({ photo, order });
    }
  });
  existing.forEach((photo) => { if (!kept.has(photo.id)) plan.toDelete.push(photo.id); });
  return plan;
}

/** Applies freshly signed URLs without touching any other state that may have changed meanwhile. */
export function applyMediaUrls(state: AppState, urls: ReadonlyMap<string, MediaUrls>): AppState {
  if (!urls.size) return state;
  return {
    ...state,
    trips: state.trips.map((trip) => {
      const photos = trip.photos.map((photo) => {
        const fresh = urls.get(photo.id);
        return fresh ? { ...photo, url: fresh.url, thumbnailUrl: fresh.thumbnailUrl } : photo;
      });
      return { ...trip, photos, coverImage: photos.find((photo) => photo.url)?.url ?? trip.coverImage };
    }),
  };
}

export function sortTrips(trips: readonly Trip[]) {
  return [...trips].sort((a, b) => b.startDate.localeCompare(a.startDate) || b.id.localeCompare(a.id));
}

// ---------------------------------------------------------------------------
// Validation (mirrors the database check constraints so users get clear messages)
// ---------------------------------------------------------------------------

export function validateRemoteTrip(trip: Trip) {
  const errors: string[] = [];
  const tooLong = (label: string, value: string | undefined, max: number) => {
    if (value && value.length > max) errors.push(`${label} must be ${max.toLocaleString("en-US")} characters or fewer.`);
  };
  tooLong("Trip name", trip.title.trim(), 120);
  tooLong("City", trip.city.trim(), 160);
  tooLong("Journal", trip.journal, 50_000);
  tooLong("Favourite memory", trip.favouriteMemory, 5_000);
  tooLong("Mood", trip.mood, 32);
  companionNames(trip).forEach((name) => tooLong("Companion name", name, 120));
  trip.places.forEach((name) => tooLong("Place name", name.trim(), 180));
  (trip.days ?? []).forEach((day) => {
    tooLong("Day title", day.title?.trim(), 120);
    tooLong("Day diary", day.notes, 20_000);
  });
  trip.photos.forEach((photo) => {
    tooLong("Photo caption", photo.caption, 2_000);
    tooLong("Photo location", photo.location, 240);
  });
  if (!/^[A-Z]{2}$/.test(trip.countryId)) errors.push("Select a supported country.");
  return [...new Set(errors)];
}

// ---------------------------------------------------------------------------
// Safe, user-facing error text (never expose raw database or auth internals)
// ---------------------------------------------------------------------------

export interface ErrorLike { code?: string | number | null; status?: number | null; message?: string | null; name?: string | null }

const looksOffline = (error: ErrorLike) => /failed to fetch|networkerror|network request failed|load failed/i.test(error.message ?? "") || error.name === "AuthRetryableFetchError" || error.name === "FunctionsFetchError";
export const OFFLINE_MESSAGE = "Golden Atlas can’t be reached. Check your connection and try again.";
export const GENERIC_MESSAGE = "Something went wrong. Please try again.";

export function describeAuthError(error: ErrorLike) {
  if (looksOffline(error)) return OFFLINE_MESSAGE;
  switch (error.code) {
    case "invalid_credentials": return "Email or password is incorrect.";
    case "email_not_confirmed": return "Confirm your email address first. Check your inbox for the link we sent.";
    case "over_request_rate_limit":
    case "over_email_send_rate_limit":
    case "over_sms_send_rate_limit": return "Too many attempts. Wait a few minutes and try again.";
    case "weak_password": return "Use at least 10 characters with letters and numbers.";
    case "same_password": return "Choose a password that is different from your current one.";
    case "user_banned": return "This account is unavailable. Contact support if you think this is a mistake.";
    case "signup_disabled": return "New accounts can’t be created right now.";
    case "email_exists":
    case "user_already_exists": return "Check your inbox for the confirmation link we sent to continue.";
    case "session_expired":
    case "session_not_found":
    case "refresh_token_not_found": return "Your session has expired. Sign in again.";
    case "validation_failed": return "Enter a valid email address.";
    default: return error.status === 429 ? "Too many attempts. Wait a few minutes and try again." : GENERIC_MESSAGE;
  }
}

export function describeDatabaseError(error: ErrorLike) {
  if (looksOffline(error)) return OFFLINE_MESSAGE;
  switch (String(error.code ?? "")) {
    case "23503": return "That country or related record isn’t available.";
    case "23505": return "That already exists.";
    case "23514":
    case "22023": return "Some details are outside the allowed range, such as dates or text length.";
    case "42501":
    case "PGRST301": return "You don’t have permission to do that. Try signing in again.";
    case "55000": return "Your account is being deleted, so new content can’t be added.";
    case "PGRST116": return "That item could not be found.";
    default: return GENERIC_MESSAGE;
  }
}

export function describeFunctionError(code: string | undefined, fallback?: string) {
  switch (code) {
    case "AUTH_REQUIRED": return "Your session has expired. Sign in again.";
    case "AUTH_RECENT_REQUIRED": return "For your security, sign in again before continuing.";
    case "NOT_AUTHORIZED": return "You don’t have permission to do that.";
    case "RESOURCE_NOT_FOUND": return "That item could not be found.";
    case "UPLOAD_INCOMPLETE": return "A photo upload didn’t finish. Try adding it again.";
    case "EXPORT_IN_PROGRESS": return "An export is already being prepared. Try again in a moment.";
    case "EXPORT_EXPIRED": return "That export has expired. Request a new one.";
    case "EXPORT_TOO_LARGE": return "Your data is too large to export in one file right now.";
    case "EXPORT_FAILED": return "The export could not be prepared. Your data is unchanged. Try again.";
    case "DELETE_FAILED": return "Deletion did not finish. Your remaining data is intact; try again to continue.";
    case "SERVICE_UNAVAILABLE": return "Golden Atlas is temporarily unavailable. Try again soon.";
    case "VALIDATION_FAILED": return fallback || "That request wasn’t valid.";
    default: return GENERIC_MESSAGE;
  }
}

// ---------------------------------------------------------------------------
// Configuration safety
// ---------------------------------------------------------------------------

/** Returns a problem description when the configured key must not ship in a browser, otherwise null. */
export function publishableKeyProblem(key: string | undefined): string | null {
  const value = key?.trim();
  if (!value || value.startsWith("replace-with")) return "VITE_SUPABASE_PUBLISHABLE_KEY is not configured.";
  if (value.startsWith("sb_secret_")) return "A Supabase secret key was supplied. Use the publishable key in browser code.";
  if (value.split(".").length === 3) {
    try {
      const payload = JSON.parse(atob(value.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
      if (payload?.role === "service_role") return "A Supabase service-role key was supplied. Use the publishable key in browser code.";
    } catch { /* not a decodable JWT; treat as an opaque key */ }
  }
  return null;
}

export function passwordProblem(password: string) {
  if (password.length < 10 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) return "Use at least 10 characters with letters and numbers.";
  return null;
}
