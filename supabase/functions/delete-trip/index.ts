import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";
import { errorResponse, logOutcome, readExactUuid } from "../_shared/http.ts";

type MemoryPaths = { original_path: string; thumbnail_path: string };

export default {
  fetch: withSupabase({ auth: "user" }, async (req, ctx) => {
    const startedAt = performance.now();
    const requestId = crypto.randomUUID();
    const tripId = await readExactUuid(req, "trip_id");
    if (!tripId) return errorResponse(400, "VALIDATION_FAILED", "A valid trip_id is required.");

    try {
      const { data: trip, error: tripError } = await ctx.supabase
        .from("trips")
        .select("id,user_id")
        .eq("id", tripId)
        .maybeSingle();
      if (tripError) throw new Error("trip_lookup_failed");
      if (!trip) return Response.json({ data: { trip_id: tripId, deleted: true } });

      while (true) {
        const { data, error } = await ctx.supabaseAdmin
          .from("memories")
          .select("original_path,thumbnail_path")
          .eq("trip_id", trip.id)
          .eq("user_id", trip.user_id)
          .limit(100);
        if (error) throw new Error("memory_lookup_failed");
        const memories = (data ?? []) as MemoryPaths[];
        if (memories.length === 0) break;

        const originals = memories.map((memory) => memory.original_path);
        const thumbnails = memories.map((memory) => memory.thumbnail_path);
        const originalRemoval = await ctx.supabaseAdmin.storage.from("travel-memories").remove(originals);
        if (originalRemoval.error) throw new Error("original_delete_failed");
        const thumbnailRemoval = await ctx.supabaseAdmin.storage.from("travel-thumbnails").remove(thumbnails);
        if (thumbnailRemoval.error) throw new Error("thumbnail_delete_failed");

        const { error: memoryDeleteError } = await ctx.supabaseAdmin
          .from("memories")
          .delete()
          .eq("trip_id", trip.id)
          .eq("user_id", trip.user_id);
        if (memoryDeleteError) throw new Error("memory_delete_failed");
      }

      const { error: deleteError } = await ctx.supabaseAdmin
        .from("trips")
        .delete()
        .eq("id", trip.id)
        .eq("user_id", trip.user_id);
      if (deleteError) throw new Error("trip_delete_failed");

      logOutcome(requestId, "delete-trip", "success", startedAt);
      return Response.json({ data: { trip_id: trip.id, deleted: true } });
    } catch {
      logOutcome(requestId, "delete-trip", "failure", startedAt, "DELETE_FAILED");
      return errorResponse(503, "DELETE_FAILED", "The trip could not be deleted.");
    }
  }),
};
