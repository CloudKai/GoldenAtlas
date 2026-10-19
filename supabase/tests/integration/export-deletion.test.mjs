import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const anonKey = process.env.SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const secretKey = process.env.SUPABASE_SECRET_KEY;

if (!url || !anonKey || !serviceRoleKey || !secretKey) {
  throw new Error("Local Supabase URL and test-only API keys are required");
}

const options = {
  auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
};
const admin = createClient(url, serviceRoleKey, options);
const internal = createClient(url, secretKey, options);
const anonymous = createClient(url, anonKey, options);

const readFunctionError = async (error) => {
  if (!error?.context) return null;
  try {
    return await error.context.json();
  } catch {
    return null;
  }
};

test("private exports, trip cleanup, and complete account deletion", { timeout: 90_000 }, async (t) => {
  const suffix = randomUUID();
  const password = "TestPassword123";
  const createdUserIds = [];

  t.after(async () => {
    for (const userId of createdUserIds) await admin.auth.admin.deleteUser(userId);
  });

  const createUser = async (label) => {
    const email = `golden-atlas-${label}-${suffix}@example.test`;
    const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    assert.ifError(error);
    assert.ok(data.user?.id);
    createdUserIds.push(data.user.id);
    const client = createClient(url, anonKey, options);
    assert.ifError((await client.auth.signInWithPassword({ email, password })).error);
    return { id: data.user.id, client };
  };

  const userA = await createUser("export-a");
  const userB = await createUser("export-b");

  const anonymousExport = await anonymous.functions.invoke("request-data-export", { body: {} });
  assert.ok(anonymousExport.error, "anonymous callers cannot request exports");
  const anonymousCleanup = await anonymous.functions.invoke("cleanup-expired-exports", { body: {} });
  assert.ok(anonymousCleanup.error, "publishable keys cannot invoke internal cleanup workers");

  const { data: tripA, error: tripAError } = await userA.client
    .from("trips")
    .insert({ country_code: "SG", name: "Singapore", start_date: "2026-01-01", end_date: "2026-01-03", journal: "Private journal" })
    .select("id")
    .single();
  assert.ifError(tripAError);

  const { data: tripB, error: tripBError } = await userB.client
    .from("trips")
    .insert({ country_code: "AU", name: "User B only", start_date: "2026-02-01", end_date: "2026-02-02" })
    .select("id")
    .single();
  assert.ifError(tripBError);

  assert.ifError((await userA.client.from("profiles").update({ display_name: "Atlas A" }).eq("id", userA.id)).error);
  assert.ifError((await userA.client.from("bucket_list").insert({ country_code: "JP", notes: "Someday" })).error);
  assert.ifError((await userA.client.from("places").insert({ trip_id: tripA.id, country_code: "SG", name: "Marina Bay" })).error);
  assert.ifError((await userA.client.from("trip_days").insert({ trip_id: tripA.id, day_date: "2026-01-02", title: "Gardens", notes: "Exported day diary" })).error);
  assert.ifError((await userB.client.from("trip_days").insert({ trip_id: tripB.id, day_date: "2026-02-01", notes: "User B diary" })).error);
  const { data: companion, error: companionError } = await userA.client
    .from("travel_companions")
    .insert({ display_name: "Travel friend" })
    .select("id")
    .single();
  assert.ifError(companionError);
  assert.ifError((await userA.client.from("trip_companions").insert({ trip_id: tripA.id, companion_id: companion.id })).error);

  const image = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);
  const { data: memory, error: memoryError } = await userA.client
    .from("memories")
    .insert({
      trip_id: tripA.id,
      caption: "Exported caption",
      original_mime_type: "image/jpeg",
      declared_size_bytes: image.byteLength,
      declared_thumbnail_size_bytes: image.byteLength,
    })
    .select("id,original_path,thumbnail_path")
    .single();
  assert.ifError(memoryError);
  assert.ifError((await userA.client.storage.from("travel-memories").upload(memory.original_path, image, { contentType: "image/jpeg" })).error);
  assert.ifError((await userA.client.storage.from("travel-thumbnails").upload(memory.thumbnail_path, image, { contentType: "image/jpeg" })).error);
  assert.ifError((await userA.client.functions.invoke("finalize-memory-upload", { body: { memory_id: memory.id } })).error);

  const firstExport = await userA.client.functions.invoke("request-data-export", { body: {} });
  assert.ifError(firstExport.error);
  assert.equal(firstExport.data.data.status, "completed");
  const exportJobId = firstExport.data.data.id;

  const repeatedExport = await userA.client.functions.invoke("request-data-export", { body: {} });
  assert.ifError(repeatedExport.error);
  assert.equal(repeatedExport.data.data.id, exportJobId, "repeated taps reuse an unexpired export");

  const { data: exportJob, error: exportJobError } = await admin
    .from("data_export_jobs")
    .select("storage_path")
    .eq("id", exportJobId)
    .single();
  assert.ifError(exportJobError);
  assert.ok(exportJob.storage_path);

  const directOwnDownload = await userA.client.storage.from("user-exports").download(exportJob.storage_path);
  assert.ok(directOwnDownload.error, "even the owner must use the trusted signed-download function");
  const crossUserJobView = await userB.client.from("data_export_jobs").select("id").eq("id", exportJobId);
  assert.ifError(crossUserJobView.error);
  assert.deepEqual(crossUserJobView.data, [], "export job RLS isolates users");

  const crossUserDownload = await userB.client.functions.invoke("get-export-download", {
    body: { export_job_id: exportJobId },
  });
  assert.ok(crossUserDownload.error);
  assert.equal((await readFunctionError(crossUserDownload.error))?.error?.code, "RESOURCE_NOT_FOUND");

  const signedExport = await userA.client.functions.invoke("get-export-download", {
    body: { export_job_id: exportJobId },
  });
  assert.ifError(signedExport.error);
  assert.equal(signedExport.data.data.expires_in_seconds, 600);
  const signedUrl = new URL(signedExport.data.data.signed_url);
  const reachableSignedUrl = signedUrl.hostname === "kong"
    ? `${url}${signedUrl.pathname}${signedUrl.search}`
    : signedUrl.toString();
  const exportResponse = await fetch(reachableSignedUrl);
  assert.equal(exportResponse.status, 200);
  const exported = await exportResponse.json();
  assert.equal(exported.profile.display_name, "Atlas A");
  assert.equal(exported.trips.length, 1);
  assert.equal(exported.trips[0].id, tripA.id);
  assert.equal(exported.trips.some((trip) => trip.id === tripB.id), false, "User B data is absent");
  assert.equal(exported.memories[0].caption, "Exported caption");
  assert.equal(exported.media_included, false);
  assert.equal(exported.trip_days.length, 1, "only the requester's day diaries are exported");
  assert.equal(exported.trip_days[0].notes, "Exported day diary");

  const expiredJobId = randomUUID();
  const expiredPath = `${userA.id}/${expiredJobId}/${randomUUID()}.json`;
  assert.ifError((await admin.storage.from("user-exports").upload(expiredPath, new TextEncoder().encode("{}"), { contentType: "application/json" })).error);
  const completedAt = new Date(Date.now() - 2 * 60 * 60 * 1000);
  assert.ifError((await admin.from("data_export_jobs").insert({
    id: expiredJobId,
    user_id: userA.id,
    status: "completed",
    completed_at: completedAt.toISOString(),
    expires_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    storage_path: expiredPath,
  })).error);
  const expiredDownload = await userA.client.functions.invoke("get-export-download", {
    body: { export_job_id: expiredJobId },
  });
  assert.ok(expiredDownload.error);
  assert.equal((await readFunctionError(expiredDownload.error))?.error?.code, "EXPORT_EXPIRED");
  assert.ok((await admin.storage.from("user-exports").download(expiredPath)).error, "expired export object is deleted");

  const scheduledExpiredJobId = randomUUID();
  const scheduledExpiredPath = `${userA.id}/${scheduledExpiredJobId}/${randomUUID()}.json`;
  assert.ifError((await admin.storage.from("user-exports").upload(scheduledExpiredPath, new TextEncoder().encode("{}"), { contentType: "application/json" })).error);
  assert.ifError((await admin.from("data_export_jobs").insert({
    id: scheduledExpiredJobId,
    user_id: userA.id,
    status: "completed",
    completed_at: completedAt.toISOString(),
    expires_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    storage_path: scheduledExpiredPath,
  })).error);
  const cleanupExports = await internal.functions.invoke("cleanup-expired-exports", { body: {} });
  if (cleanupExports.error) {
    throw new Error(`cleanup-expired-exports failed: ${JSON.stringify(await readFunctionError(cleanupExports.error))}`);
  }
  assert.ok(cleanupExports.data.data.cleaned >= 1);
  assert.ok((await admin.storage.from("user-exports").download(scheduledExpiredPath)).error);

  const { data: abandoned, error: abandonedError } = await userB.client
    .from("memories")
    .insert({
      trip_id: tripB.id,
      original_mime_type: "image/jpeg",
      declared_size_bytes: image.byteLength,
      declared_thumbnail_size_bytes: image.byteLength,
    })
    .select("id,original_path,thumbnail_path")
    .single();
  assert.ifError(abandonedError);
  assert.ifError((await userB.client.storage.from("travel-memories").upload(abandoned.original_path, image, { contentType: "image/jpeg" })).error);
  assert.ifError((await admin.from("memories").update({ created_at: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString() }).eq("id", abandoned.id)).error);
  const cleanupUploads = await internal.functions.invoke("cleanup-abandoned-uploads", { body: {} });
  if (cleanupUploads.error) {
    throw new Error(`cleanup-abandoned-uploads failed: ${JSON.stringify(await readFunctionError(cleanupUploads.error))}`);
  }
  assert.ok(cleanupUploads.data.data.cleaned >= 1);
  assert.deepEqual((await admin.from("memories").select("id").eq("id", abandoned.id)).data, []);
  assert.ok((await admin.storage.from("travel-memories").download(abandoned.original_path)).error);

  const crossDeleteTrip = await userB.client.functions.invoke("delete-trip", { body: { trip_id: tripA.id } });
  assert.ifError(crossDeleteTrip.error);
  assert.equal(crossDeleteTrip.data.data.deleted, true);
  assert.equal((await userA.client.from("trips").select("id").eq("id", tripA.id)).data.length, 1);

  const ownDeleteTrip = await userA.client.functions.invoke("delete-trip", { body: { trip_id: tripA.id } });
  assert.ifError(ownDeleteTrip.error);
  assert.equal(ownDeleteTrip.data.data.deleted, true);
  assert.ok((await admin.storage.from("travel-memories").download(memory.original_path)).error);
  assert.ok((await admin.storage.from("travel-thumbnails").download(memory.thumbnail_path)).error);
  assert.deepEqual((await userA.client.from("memories").select("id").eq("id", memory.id)).data, []);
  assert.ifError((await userA.client.functions.invoke("delete-trip", { body: { trip_id: tripA.id } })).error);

  const { data: finalTrip, error: finalTripError } = await userA.client
    .from("trips")
    .insert({ country_code: "FR", name: "Before deletion", start_date: "2026-03-01", end_date: "2026-03-01" })
    .select("id")
    .single();
  assert.ifError(finalTripError);
  const { data: finalMemory, error: finalMemoryError } = await userA.client
    .from("memories")
    .insert({
      trip_id: finalTrip.id,
      original_mime_type: "image/jpeg",
      declared_size_bytes: image.byteLength,
      declared_thumbnail_size_bytes: image.byteLength,
    })
    .select("original_path,thumbnail_path")
    .single();
  assert.ifError(finalMemoryError);
  assert.ifError((await userA.client.storage.from("travel-memories").upload(finalMemory.original_path, image, { contentType: "image/jpeg" })).error);
  assert.ifError((await userA.client.storage.from("travel-thumbnails").upload(finalMemory.thumbnail_path, image, { contentType: "image/jpeg" })).error);

  const deleteAccount = await userA.client.functions.invoke("delete-account", { body: { confirmation: "DELETE" } });
  assert.ifError(deleteAccount.error);
  assert.equal(deleteAccount.data.data.deleted, true);
  assert.ok((await admin.auth.admin.getUserById(userA.id)).error, "authentication account is deleted");
  assert.deepEqual((await admin.from("profiles").select("id").eq("id", userA.id)).data, []);
  assert.deepEqual((await admin.from("trips").select("id").eq("user_id", userA.id)).data, []);
  assert.ok((await admin.storage.from("travel-memories").download(finalMemory.original_path)).error);
  assert.ok((await admin.storage.from("travel-thumbnails").download(finalMemory.thumbnail_path)).error);
  assert.ok((await admin.storage.from("user-exports").download(exportJob.storage_path)).error);

  const userBTrip = await userB.client.from("trips").select("id").eq("id", tripB.id).single();
  assert.ifError(userBTrip.error);
  assert.equal(userBTrip.data.id, tripB.id, "another user's data survives account deletion");
});
