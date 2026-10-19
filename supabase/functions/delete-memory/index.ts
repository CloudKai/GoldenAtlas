import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

type Memory = {
  id: string;
  user_id: string;
  original_path: string;
  thumbnail_path: string;
};

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

export default {
  fetch: withSupabase({ auth: "user" }, async (req, ctx) => {
    const startedAt = performance.now();
    const requestId = crypto.randomUUID();
    const memoryId = await parseMemoryId(req);
    if (!memoryId) return errorResponse(400, "VALIDATION_FAILED", "A valid memory_id is required.");

    try {
      const { data, error } = await ctx.supabase
        .from("memories")
        .select("id,user_id,original_path,thumbnail_path")
        .eq("id", memoryId)
        .maybeSingle();

      if (error) return errorResponse(503, "SERVICE_UNAVAILABLE", "The memory could not be checked.");
      if (!data) return Response.json({ data: { memory_id: memoryId, deleted: true } });

      const memory = data as Memory;
      const originalDelete = await ctx.supabaseAdmin.storage
        .from("travel-memories")
        .remove([memory.original_path]);
      if (originalDelete.error) {
        return errorResponse(503, "SERVICE_UNAVAILABLE", "The memory could not be deleted.");
      }

      const thumbnailDelete = await ctx.supabaseAdmin.storage
        .from("travel-thumbnails")
        .remove([memory.thumbnail_path]);
      if (thumbnailDelete.error) {
        return errorResponse(503, "SERVICE_UNAVAILABLE", "The memory could not be deleted.");
      }

      const { error: deleteError } = await ctx.supabaseAdmin
        .from("memories")
        .delete()
        .eq("id", memory.id)
        .eq("user_id", memory.user_id);
      if (deleteError) return errorResponse(503, "SERVICE_UNAVAILABLE", "The memory could not be deleted.");

      console.info(JSON.stringify({
        request_id: requestId,
        function: "delete-memory",
        outcome: "success",
        duration_ms: Math.round(performance.now() - startedAt),
      }));
      return Response.json({ data: { memory_id: memory.id, deleted: true } });
    } catch {
      console.error(JSON.stringify({
        request_id: requestId,
        function: "delete-memory",
        outcome: "failure",
        error_code: "SERVICE_UNAVAILABLE",
        duration_ms: Math.round(performance.now() - startedAt),
      }));
      return errorResponse(503, "SERVICE_UNAVAILABLE", "The memory could not be deleted.");
    }
  }),
};
