import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

type Memory = {
  id: string;
  user_id: string;
  original_path: string;
  thumbnail_path: string;
  original_mime_type: "image/jpeg" | "image/png";
  declared_size_bytes: number;
  declared_thumbnail_size_bytes: number;
  upload_status: "pending" | "ready" | "failed";
};

type StoredObject = { metadata?: { mimetype?: string; size?: number | string } | null };

const errorResponse = (status: number, code: string, message: string) =>
  Response.json({ error: { code, message } }, { status });

const parseMemoryId = async (req: Request): Promise<string | null> => {
  if (req.method !== "POST") return null;
  try {
    const body = await req.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) return null;
    const keys = Object.keys(body);
    if (keys.length !== 1 || keys[0] !== "memory_id") return null;
    return typeof body.memory_id === "string" && /^[0-9a-f-]{36}$/i.test(body.memory_id)
      ? body.memory_id
      : null;
  } catch {
    return null;
  }
};

const findObject = async (
  supabaseAdmin: Parameters<Parameters<typeof withSupabase>[1]>[1]["supabaseAdmin"],
  bucket: string,
  objectPath: string,
): Promise<StoredObject | null> => {
  const separator = objectPath.lastIndexOf("/");
  const folder = objectPath.slice(0, separator);
  const filename = objectPath.slice(separator + 1);
  const { data, error } = await supabaseAdmin.storage
    .from(bucket)
    .list(folder, { limit: 10, search: filename });
  if (error) throw new Error("storage_lookup_failed");
  return (data?.find((entry) => entry.name === filename) as StoredObject | undefined) ?? null;
};

export default {
  fetch: withSupabase({ auth: "user" }, async (req, ctx) => {
    const startedAt = performance.now();
    const requestId = crypto.randomUUID();
    const memoryId = await parseMemoryId(req);
    if (!memoryId) return errorResponse(400, "VALIDATION_FAILED", "A valid memory_id is required.");

    try {
      const { data, error } = await ctx.supabase
        .from("memories")
        .select("id,user_id,original_path,thumbnail_path,original_mime_type,declared_size_bytes,declared_thumbnail_size_bytes,upload_status")
        .eq("id", memoryId)
        .maybeSingle();

      if (error) return errorResponse(503, "SERVICE_UNAVAILABLE", "The memory could not be checked.");
      if (!data) return errorResponse(404, "RESOURCE_NOT_FOUND", "The memory was not found.");

      const memory = data as Memory;
      if (memory.upload_status === "ready") {
        return Response.json({ data: { memory_id: memory.id, upload_status: "ready" } });
      }
      if (memory.upload_status !== "pending") {
        return errorResponse(409, "UPLOAD_INCOMPLETE", "This upload can no longer be finalized.");
      }

      const [original, thumbnail] = await Promise.all([
        findObject(ctx.supabaseAdmin, "travel-memories", memory.original_path),
        findObject(ctx.supabaseAdmin, "travel-thumbnails", memory.thumbnail_path),
      ]);

      if (!original || !thumbnail) {
        return errorResponse(409, "UPLOAD_INCOMPLETE", "Both the original and thumbnail must be uploaded first.");
      }

      const originalSize = Number(original.metadata?.size);
      const thumbnailSize = Number(thumbnail.metadata?.size);
      const metadataIsValid =
        original.metadata?.mimetype === memory.original_mime_type &&
        thumbnail.metadata?.mimetype === "image/jpeg" &&
        Number.isSafeInteger(originalSize) &&
        Number.isSafeInteger(thumbnailSize) &&
        originalSize === memory.declared_size_bytes &&
        thumbnailSize === memory.declared_thumbnail_size_bytes &&
        originalSize <= 15 * 1024 * 1024 &&
        thumbnailSize <= 512 * 1024;

      if (!metadataIsValid) {
        await Promise.allSettled([
          ctx.supabaseAdmin.storage.from("travel-memories").remove([memory.original_path]),
          ctx.supabaseAdmin.storage.from("travel-thumbnails").remove([memory.thumbnail_path]),
        ]);
        await ctx.supabaseAdmin
          .from("memories")
          .update({ upload_status: "failed" })
          .eq("id", memory.id)
          .eq("user_id", memory.user_id);
        return errorResponse(422, "VALIDATION_FAILED", "Stored image metadata did not match the pending memory.");
      }

      const { error: updateError } = await ctx.supabaseAdmin
        .from("memories")
        .update({
          stored_size_bytes: originalSize,
          stored_thumbnail_size_bytes: thumbnailSize,
          upload_status: "ready",
        })
        .eq("id", memory.id)
        .eq("user_id", memory.user_id)
        .eq("upload_status", "pending");

      if (updateError) return errorResponse(503, "SERVICE_UNAVAILABLE", "The upload could not be finalized.");

      console.info(JSON.stringify({
        request_id: requestId,
        function: "finalize-memory-upload",
        outcome: "success",
        duration_ms: Math.round(performance.now() - startedAt),
      }));
      return Response.json({ data: { memory_id: memory.id, upload_status: "ready" } });
    } catch {
      console.error(JSON.stringify({
        request_id: requestId,
        function: "finalize-memory-upload",
        outcome: "failure",
        error_code: "SERVICE_UNAVAILABLE",
        duration_ms: Math.round(performance.now() - startedAt),
      }));
      return errorResponse(503, "SERVICE_UNAVAILABLE", "The upload could not be finalized.");
    }
  }),
};
