import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const anonKey = process.env.SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !anonKey || !serviceRoleKey) {
  throw new Error("SUPABASE_URL, SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY are required");
}

const clientOptions = {
  auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
};

const admin = createClient(url, serviceRoleKey, clientOptions);
const anonymous = createClient(url, anonKey, clientOptions);

const readFunctionError = async (error) => {
  if (!error?.context) return null;
  try {
    return await error.context.json();
  } catch {
    return null;
  }
};

test("private memory lifecycle and User A/User B isolation", { timeout: 60_000 }, async (t) => {
  const suffix = randomUUID();
  const password = "TestPassword123";
  const emailA = `golden-atlas-a-${suffix}@example.test`;
  const emailB = `golden-atlas-b-${suffix}@example.test`;
  const createdUserIds = [];
  const objectsToRemove = [];

  t.after(async () => {
    for (const { bucket, path } of objectsToRemove) {
      await admin.storage.from(bucket).remove([path]);
    }
    for (const userId of createdUserIds) {
      await admin.auth.admin.deleteUser(userId);
    }
  });

  const register = async (email) => {
    const registrationClient = createClient(url, anonKey, clientOptions);
    const { data, error } = await registrationClient.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: "goldenatlas://auth/callback" },
    });
    assert.ifError(error);
    assert.ok(data.user?.id, "registration returns a user awaiting email verification");
    assert.equal(data.session, null, "email verification is required before login");
    createdUserIds.push(data.user.id);

    const { error: confirmationError } = await admin.auth.admin.updateUserById(data.user.id, {
      email_confirm: true,
    });
    assert.ifError(confirmationError);
    return data.user.id;
  };

  const userAId = await register(emailA);
  const userBId = await register(emailB);

  const anonymousFunctionCall = await anonymous.functions.invoke("finalize-memory-upload", {
    body: { memory_id: randomUUID() },
  });
  assert.ok(anonymousFunctionCall.error, "anonymous callers cannot reach authenticated functions");

  const userA = createClient(url, anonKey, clientOptions);
  const userB = createClient(url, anonKey, clientOptions);
  assert.ifError((await userA.auth.signInWithPassword({ email: emailA, password })).error);
  assert.ifError((await userB.auth.signInWithPassword({ email: emailB, password })).error);

  const { count: denominator, error: countryError } = await anonymous
    .from("countries")
    .select("iso_code", { count: "exact", head: true })
    .eq("counts_toward_world_total", true);
  assert.ifError(countryError);
  assert.equal(denominator, 195);

  const { data: tripsA, error: tripsAError } = await userA
    .from("trips")
    .insert([
      { country_code: "FR", name: "Paris spring", start_date: "2025-03-01", end_date: "2025-03-03" },
      { country_code: "FR", name: "Paris autumn", start_date: "2025-10-01", end_date: "2025-10-02" },
    ])
    .select("id");
  assert.ifError(tripsAError);
  assert.equal(tripsA.length, 2, "multiple trips in one country are supported");

  const { data: tripB, error: tripBError } = await userB
    .from("trips")
    .insert({ country_code: "JP", name: "Tokyo", start_date: "2025-04-01", end_date: "2025-04-02" })
    .select("id")
    .single();
  assert.ifError(tripBError);

  const { data: userBView, error: isolationError } = await userB.from("trips").select("id");
  assert.ifError(isolationError);
  assert.deepEqual(userBView.map(({ id }) => id), [tripB.id], "User B cannot see User A trips");

  const image = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);
  const thumbnail = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);

  const { data: memoryA, error: memoryAError } = await userA
    .from("memories")
    .insert({
      trip_id: tripsA[0].id,
      caption: "A private memory",
      original_mime_type: "image/jpeg",
      declared_size_bytes: image.byteLength,
      declared_thumbnail_size_bytes: thumbnail.byteLength,
    })
    .select("id,original_path,thumbnail_path,upload_status")
    .single();
  assert.ifError(memoryAError);
  assert.equal(memoryA.upload_status, "pending");
  assert.match(memoryA.original_path, new RegExp(`^${userAId}/${tripsA[0].id}/${memoryA.id}/[0-9a-f-]+\\.jpg$`));

  const { data: memoryB, error: memoryBError } = await userB
    .from("memories")
    .insert({
      trip_id: tripB.id,
      original_mime_type: "image/jpeg",
      declared_size_bytes: image.byteLength,
      declared_thumbnail_size_bytes: thumbnail.byteLength,
    })
    .select("id,original_path,thumbnail_path")
    .single();
  assert.ifError(memoryBError);

  const crossUserUpload = await userA.storage
    .from("travel-memories")
    .upload(memoryB.original_path, image, { contentType: "image/jpeg", upsert: false });
  assert.ok(crossUserUpload.error, "User A cannot upload to User B's registered path");

  const arbitraryUpload = await userA.storage
    .from("travel-memories")
    .upload(`${userAId}/arbitrary.jpg`, image, { contentType: "image/jpeg", upsert: false });
  assert.ok(arbitraryUpload.error, "arbitrary paths are rejected");

  const wrongMimeUpload = await userB.storage
    .from("travel-thumbnails")
    .upload(memoryB.thumbnail_path, thumbnail, { contentType: "image/png", upsert: false });
  assert.ok(wrongMimeUpload.error, "thumbnail MIME restrictions are enforced by Storage");

  for (const [bucket, path, bytes, contentType] of [
    ["travel-memories", memoryA.original_path, image, "image/jpeg"],
    ["travel-thumbnails", memoryA.thumbnail_path, thumbnail, "image/jpeg"],
  ]) {
    const { error } = await userA.storage.from(bucket).upload(path, bytes, { contentType, upsert: false });
    assert.ifError(error);
    objectsToRemove.push({ bucket, path });
  }

  const forbiddenStateChange = await userA
    .from("memories")
    .update({ upload_status: "ready" })
    .eq("id", memoryA.id);
  assert.ok(forbiddenStateChange.error, "clients cannot mark their own upload ready");

  const { data: finalized, error: finalizeError } = await userA.functions.invoke("finalize-memory-upload", {
    body: { memory_id: memoryA.id },
  });
  assert.ifError(finalizeError);
  assert.equal(finalized.data.upload_status, "ready");

  const { data: readyMemory, error: readyMemoryError } = await userA
    .from("memories")
    .select("upload_status,stored_size_bytes,stored_thumbnail_size_bytes")
    .eq("id", memoryA.id)
    .single();
  assert.ifError(readyMemoryError);
  assert.deepEqual(readyMemory, {
    upload_status: "ready",
    stored_size_bytes: image.byteLength,
    stored_thumbnail_size_bytes: thumbnail.byteLength,
  });

  const { data: statistics, error: statisticsError } = await userA
    .from("personal_statistics")
    .select("total_trips,countries_visited,total_memories")
    .single();
  assert.ifError(statisticsError);
  assert.deepEqual(statistics, { total_trips: 2, countries_visited: 1, total_memories: 1 });

  const signedByB = await userB.storage.from("travel-thumbnails").createSignedUrl(memoryA.thumbnail_path, 600);
  assert.ok(signedByB.error, "User B cannot sign User A's thumbnail URL");

  const signedByA = await userA.storage.from("travel-thumbnails").createSignedUrl(memoryA.thumbnail_path, 1);
  assert.ifError(signedByA.error);
  assert.equal((await fetch(signedByA.data.signedUrl)).status, 200, "signed URL serves the private thumbnail");
  await new Promise((resolve) => setTimeout(resolve, 1_200));
  assert.notEqual((await fetch(signedByA.data.signedUrl)).status, 200, "signed URL expires");

  const anonymousDownload = await anonymous.storage.from("travel-thumbnails").download(memoryA.thumbnail_path);
  assert.ok(anonymousDownload.error, "anonymous users cannot download private media");

  const { error: missingThumbnailInvokeError } = await userB.functions.invoke("finalize-memory-upload", {
    body: { memory_id: memoryB.id },
  });
  assert.ok(missingThumbnailInvokeError);
  const missingThumbnailBody = await readFunctionError(missingThumbnailInvokeError);
  assert.equal(missingThumbnailBody?.error?.code, "UPLOAD_INCOMPLETE");

  const unsupportedMime = await userA.from("memories").insert({
    trip_id: tripsA[0].id,
    original_mime_type: "image/gif",
    declared_size_bytes: 4,
    declared_thumbnail_size_bytes: 4,
  });
  assert.ok(unsupportedMime.error, "unsupported original MIME types are rejected");

  const excessiveSize = await userA.from("memories").insert({
    trip_id: tripsA[0].id,
    original_mime_type: "image/jpeg",
    declared_size_bytes: 15 * 1024 * 1024 + 1,
    declared_thumbnail_size_bytes: 4,
  });
  assert.ok(excessiveSize.error, "excessive declared original sizes are rejected");

  const forgedOwner = await userA.from("trips").insert({
    user_id: userBId,
    country_code: "GB",
    name: "Forged owner",
    start_date: "2025-05-01",
    end_date: "2025-05-02",
  });
  assert.ok(forgedOwner.error, "ownership reassignment is rejected");

  const crossUserDelete = await userB.functions.invoke("delete-memory", { body: { memory_id: memoryA.id } });
  assert.ifError(crossUserDelete.error);
  assert.equal(crossUserDelete.data.data.deleted, true, "deletion does not reveal another user's memory");
  const { data: memoryAfterCrossUserDelete, error: memoryAfterCrossUserDeleteError } = await userA
    .from("memories")
    .select("id")
    .eq("id", memoryA.id)
    .single();
  assert.ifError(memoryAfterCrossUserDeleteError);
  assert.equal(memoryAfterCrossUserDelete.id, memoryA.id, "cross-user deletion did not remove the memory");

  const firstDelete = await userA.functions.invoke("delete-memory", { body: { memory_id: memoryA.id } });
  assert.ifError(firstDelete.error);
  assert.equal(firstDelete.data.data.deleted, true);
  const secondDelete = await userA.functions.invoke("delete-memory", { body: { memory_id: memoryA.id } });
  assert.ifError(secondDelete.error);
  assert.equal(secondDelete.data.data.deleted, true, "memory deletion is safe to retry");

  const { data: deletedRows, error: deletedRowsError } = await userA
    .from("memories")
    .select("id")
    .eq("id", memoryA.id);
  assert.ifError(deletedRowsError);
  assert.deepEqual(deletedRows, []);
});
