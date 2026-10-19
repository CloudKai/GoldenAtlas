import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";
import { errorResponse, logOutcome, readExactUuid } from "../_shared/http.ts";

const SIGNED_URL_TTL_SECONDS = 600;

export default {
  fetch: withSupabase({ auth: "user" }, async (req, ctx) => {
    const startedAt = performance.now();
    const requestId = crypto.randomUUID();
    const exportJobId = await readExactUuid(req, "export_job_id");
    if (!exportJobId) return errorResponse(400, "VALIDATION_FAILED", "A valid export_job_id is required.");

    try {
      const { data: job, error } = await ctx.supabase
        .from("data_export_jobs")
        .select("id,status,expires_at,storage_path")
        .eq("id", exportJobId)
        .maybeSingle();
      if (error) throw new Error("job_lookup_failed");
      if (!job) return errorResponse(404, "RESOURCE_NOT_FOUND", "The export was not found.");
      if (job.status !== "completed" || !job.storage_path || !job.expires_at) {
        return errorResponse(409, "EXPORT_IN_PROGRESS", "The export is not ready for download.");
      }

      if (new Date(job.expires_at).getTime() <= Date.now()) {
        const removal = await ctx.supabaseAdmin.storage.from("user-exports").remove([job.storage_path]);
        if (!removal.error) {
          await ctx.supabaseAdmin
            .from("data_export_jobs")
            .update({ status: "expired", storage_path: null })
            .eq("id", job.id)
            .eq("status", "completed");
        }
        return errorResponse(410, "EXPORT_EXPIRED", "The export has expired.");
      }

      const signed = await ctx.supabaseAdmin.storage
        .from("user-exports")
        .createSignedUrl(job.storage_path, SIGNED_URL_TTL_SECONDS);
      if (signed.error || !signed.data?.signedUrl) throw new Error("sign_failed");

      logOutcome(requestId, "get-export-download", "success", startedAt);
      return Response.json({
        data: {
          export_job_id: job.id,
          signed_url: signed.data.signedUrl,
          expires_in_seconds: SIGNED_URL_TTL_SECONDS,
        },
      });
    } catch {
      logOutcome(requestId, "get-export-download", "failure", startedAt, "SERVICE_UNAVAILABLE");
      return errorResponse(503, "SERVICE_UNAVAILABLE", "The export download could not be created.");
    }
  }),
};
