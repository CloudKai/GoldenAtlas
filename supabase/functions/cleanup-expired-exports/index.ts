import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";
import { errorResponse, logOutcome } from "../_shared/http.ts";

export default {
  fetch: withSupabase({ auth: ["publishable", "secret"] }, async (req, ctx) => {
    const startedAt = performance.now();
    const requestId = crypto.randomUUID();
    if (req.method !== "POST") return errorResponse(400, "VALIDATION_FAILED", "POST is required.");
    if (ctx.authMode !== "secret") return errorResponse(403, "NOT_AUTHORIZED", "A server secret is required.");

    try {
      const { data: jobs, error } = await ctx.supabaseAdmin
        .from("data_export_jobs")
        .select("id,storage_path")
        .eq("status", "completed")
        .lte("expires_at", new Date().toISOString())
        .order("expires_at", { ascending: true })
        .limit(100);
      if (error) throw new Error("job_lookup_failed");

      let cleaned = 0;
      for (const job of jobs ?? []) {
        if (job.storage_path) {
          const removal = await ctx.supabaseAdmin.storage.from("user-exports").remove([job.storage_path]);
          if (removal.error) continue;
        }
        const { error: updateError } = await ctx.supabaseAdmin
          .from("data_export_jobs")
          .update({ status: "expired", storage_path: null })
          .eq("id", job.id)
          .eq("status", "completed");
        if (!updateError) cleaned += 1;
      }

      logOutcome(requestId, "cleanup-expired-exports", "success", startedAt);
      return Response.json({ data: { cleaned, has_more: (jobs?.length ?? 0) === 100 } });
    } catch {
      logOutcome(requestId, "cleanup-expired-exports", "failure", startedAt, "SERVICE_UNAVAILABLE");
      return errorResponse(503, "SERVICE_UNAVAILABLE", "Expired exports could not be cleaned.");
    }
  }),
};
