import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";
import { errorResponse, logOutcome } from "../_shared/http.ts";

const ABANDONED_AFTER_HOURS = 24;

export default {
  fetch: withSupabase({ auth: ["publishable", "secret"] }, async (req, ctx) => {
    const startedAt = performance.now();
    const requestId = crypto.randomUUID();
    if (req.method !== "POST") return errorResponse(400, "VALIDATION_FAILED", "POST is required.");
    if (ctx.authMode !== "secret") return errorResponse(403, "NOT_AUTHORIZED", "A server secret is required.");

    try {
      const cutoff = new Date(Date.now() - ABANDONED_AFTER_HOURS * 60 * 60 * 1000).toISOString();
      const { data: memories, error } = await ctx.supabaseAdmin
        .from("memories")
        .select("id,user_id,original_path,thumbnail_path")
        .in("upload_status", ["pending", "failed"])
        .lte("created_at", cutoff)
        .order("created_at", { ascending: true })
        .limit(100);
      if (error) throw new Error("memory_lookup_failed");

      let cleaned = 0;
      for (const memory of memories ?? []) {
        const originalRemoval = await ctx.supabaseAdmin.storage
          .from("travel-memories")
          .remove([memory.original_path]);
        if (originalRemoval.error) continue;
        const thumbnailRemoval = await ctx.supabaseAdmin.storage
          .from("travel-thumbnails")
          .remove([memory.thumbnail_path]);
        if (thumbnailRemoval.error) continue;

        const { error: deleteError } = await ctx.supabaseAdmin
          .from("memories")
          .delete()
          .eq("id", memory.id)
          .eq("user_id", memory.user_id)
          .in("upload_status", ["pending", "failed"]);
        if (!deleteError) cleaned += 1;
      }

      logOutcome(requestId, "cleanup-abandoned-uploads", "success", startedAt);
      return Response.json({
        data: {
          cleaned,
          has_more: (memories?.length ?? 0) === 100,
          abandoned_after_hours: ABANDONED_AFTER_HOURS,
        },
      });
    } catch {
      logOutcome(requestId, "cleanup-abandoned-uploads", "failure", startedAt, "SERVICE_UNAVAILABLE");
      return errorResponse(503, "SERVICE_UNAVAILABLE", "Abandoned uploads could not be cleaned.");
    }
  }),
};
