import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";
import { errorResponse, logOutcome } from "../_shared/http.ts";

type MemoryPaths = { original_path: string; thumbnail_path: string };
const RECENT_AUTH_SECONDS = 15 * 60;

const hasConfirmation = async (req: Request) => {
  if (req.method !== "POST") return false;
  try {
    const body = await req.json();
    return body && typeof body === "object" && !Array.isArray(body) &&
      Object.keys(body).length === 1 && body.confirmation === "DELETE";
  } catch {
    return false;
  }
};

export default {
  fetch: withSupabase({ auth: "user" }, async (req, ctx) => {
    const startedAt = performance.now();
    const requestId = crypto.randomUUID();
    if (!(await hasConfirmation(req))) {
      return errorResponse(400, "VALIDATION_FAILED", "Type DELETE to confirm account deletion.");
    }

    const userId = ctx.userClaims?.id;
    if (!userId) return errorResponse(401, "AUTH_REQUIRED", "Authentication is required.");
    const issuedAt = Number(ctx.jwtClaims?.iat);
    const tokenAgeSeconds = Math.floor(Date.now() / 1000) - issuedAt;
    if (!Number.isFinite(issuedAt) || tokenAgeSeconds < 0 || tokenAgeSeconds > RECENT_AUTH_SECONDS) {
      return errorResponse(401, "AUTH_RECENT_REQUIRED", "Sign in again before deleting the account.");
    }

    try {
      const { data: profile, error: profileError } = await ctx.supabase
        .from("profiles")
        .select("id")
        .maybeSingle();
      if (profileError) throw new Error("profile_lookup_failed");
      if (!profile) return Response.json({ data: { deleted: true } });

      const { data: existingRequest, error: requestLookupError } = await ctx.supabaseAdmin
        .from("account_deletion_requests")
        .select("id,retry_count")
        .eq("user_id", userId)
        .maybeSingle();
      if (requestLookupError) throw new Error("request_lookup_failed");

      if (existingRequest) {
        const { error } = await ctx.supabaseAdmin
          .from("account_deletion_requests")
          .update({
            status: "processing",
            failure_code: null,
            retry_count: existingRequest.retry_count + 1,
          })
          .eq("id", existingRequest.id)
          .eq("user_id", userId);
        if (error) throw new Error("request_update_failed");
      } else {
        const { error } = await ctx.supabaseAdmin
          .from("account_deletion_requests")
          .insert({ user_id: userId, status: "processing" });
        if (error) throw new Error("request_create_failed");
      }

      const markFailure = async (failureCode: string) => {
        await ctx.supabaseAdmin
          .from("account_deletion_requests")
          .update({ status: "failed", failure_code: failureCode })
          .eq("user_id", userId);
      };

      const { data: exportJobs, error: exportJobsError } = await ctx.supabaseAdmin
        .from("data_export_jobs")
        .select("id,storage_path")
        .eq("user_id", userId);
      if (exportJobsError) {
        await markFailure("EXPORT_LOOKUP_FAILED");
        throw new Error("export_lookup_failed");
      }
      for (const job of exportJobs ?? []) {
        if (job.storage_path) {
          const removal = await ctx.supabaseAdmin.storage.from("user-exports").remove([job.storage_path]);
          if (removal.error) {
            await markFailure("STORAGE_DELETE_FAILED");
            return errorResponse(503, "DELETE_FAILED", "Account deletion can be retried.");
          }
        }
      }
      const { error: cancelError } = await ctx.supabaseAdmin
        .from("data_export_jobs")
        .update({ status: "cancelled", storage_path: null, error_code: null })
        .eq("user_id", userId);
      if (cancelError) {
        await markFailure("EXPORT_CANCEL_FAILED");
        throw new Error("export_cancel_failed");
      }

      while (true) {
        const { data, error } = await ctx.supabaseAdmin
          .from("memories")
          .select("original_path,thumbnail_path")
          .eq("user_id", userId)
          .limit(100);
        if (error) {
          await markFailure("MEMORY_LOOKUP_FAILED");
          throw new Error("memory_lookup_failed");
        }
        const memories = (data ?? []) as MemoryPaths[];
        if (memories.length === 0) break;

        const originalRemoval = await ctx.supabaseAdmin.storage
          .from("travel-memories")
          .remove(memories.map((memory) => memory.original_path));
        if (originalRemoval.error) {
          await markFailure("STORAGE_DELETE_FAILED");
          return errorResponse(503, "DELETE_FAILED", "Account deletion can be retried.");
        }
        const thumbnailRemoval = await ctx.supabaseAdmin.storage
          .from("travel-thumbnails")
          .remove(memories.map((memory) => memory.thumbnail_path));
        if (thumbnailRemoval.error) {
          await markFailure("STORAGE_DELETE_FAILED");
          return errorResponse(503, "DELETE_FAILED", "Account deletion can be retried.");
        }

        const { error: memoryDeleteError } = await ctx.supabaseAdmin
          .from("memories")
          .delete()
          .eq("user_id", userId);
        if (memoryDeleteError) {
          await markFailure("DATABASE_DELETE_FAILED");
          return errorResponse(503, "DELETE_FAILED", "Account deletion can be retried.");
        }
      }

      const { error: authDeleteError } = await ctx.supabaseAdmin.auth.admin.deleteUser(userId, false);
      if (authDeleteError) {
        await markFailure("AUTH_DELETE_FAILED");
        return errorResponse(503, "DELETE_FAILED", "Account deletion can be retried.");
      }

      logOutcome(requestId, "delete-account", "success", startedAt);
      return Response.json({ data: { deleted: true } });
    } catch {
      logOutcome(requestId, "delete-account", "failure", startedAt, "DELETE_FAILED");
      return errorResponse(503, "DELETE_FAILED", "Account deletion can be retried.");
    }
  }),
};
