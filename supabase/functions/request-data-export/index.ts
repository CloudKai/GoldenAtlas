import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";
import { errorResponse, logOutcome } from "../_shared/http.ts";

const EXPORT_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_EXPORT_BYTES = 10 * 1024 * 1024;
const PAGE_SIZE = 500;

const acceptsEmptyPost = async (req: Request) => {
  if (req.method !== "POST") return false;
  try {
    const text = await req.text();
    if (!text) return true;
    const body = JSON.parse(text);
    return body && typeof body === "object" && !Array.isArray(body) && Object.keys(body).length === 0;
  } catch {
    return false;
  }
};

export default {
  fetch: withSupabase({ auth: "user" }, async (req, ctx) => {
    const startedAt = performance.now();
    const requestId = crypto.randomUUID();
    if (!(await acceptsEmptyPost(req))) {
      return errorResponse(400, "VALIDATION_FAILED", "The request body must be empty.");
    }

    const userId = ctx.userClaims?.id;
    if (!userId) return errorResponse(401, "AUTH_REQUIRED", "Authentication is required.");
    const now = new Date();

    try {
      const { data: reusable, error: reusableError } = await ctx.supabase
        .from("data_export_jobs")
        .select("id,status,requested_at,completed_at,expires_at")
        .eq("status", "completed")
        .gt("expires_at", now.toISOString())
        .order("completed_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (reusableError) throw new Error("job_lookup_failed");
      if (reusable) return Response.json({ data: reusable });

      const { data: active, error: activeError } = await ctx.supabase
        .from("data_export_jobs")
        .select("id,status,requested_at,completed_at,expires_at")
        .in("status", ["requested", "processing"])
        .order("requested_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (activeError) throw new Error("job_lookup_failed");
      if (active) return Response.json({ data: active }, { status: 202 });

      const { data: expiredJobs, error: expiredError } = await ctx.supabase
        .from("data_export_jobs")
        .select("id,storage_path")
        .eq("status", "completed")
        .lte("expires_at", now.toISOString())
        .limit(20);
      if (expiredError) throw new Error("expired_lookup_failed");
      for (const expired of expiredJobs ?? []) {
        if (expired.storage_path) {
          const removal = await ctx.supabaseAdmin.storage.from("user-exports").remove([expired.storage_path]);
          if (removal.error) continue;
        }
        await ctx.supabaseAdmin
          .from("data_export_jobs")
          .update({ status: "expired", storage_path: null })
          .eq("id", expired.id)
          .eq("user_id", userId)
          .eq("status", "completed");
      }

      const { data: job, error: insertError } = await ctx.supabaseAdmin
        .from("data_export_jobs")
        .insert({ user_id: userId, status: "processing" })
        .select("id,status,requested_at")
        .single();
      if (insertError || !job) {
        const { data: racedJob } = await ctx.supabase
          .from("data_export_jobs")
          .select("id,status,requested_at,completed_at,expires_at")
          .in("status", ["requested", "processing"])
          .order("requested_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (racedJob) return Response.json({ data: racedJob }, { status: 202 });
        throw new Error("job_create_failed");
      }

      let storagePath: string | null = null;
      try {
        const fetchAll = async (table: string) => {
          const rows: unknown[] = [];
          for (let from = 0; ; from += PAGE_SIZE) {
            const { data, error } = await ctx.supabase.from(table).select("*").range(from, from + PAGE_SIZE - 1);
            if (error) throw new Error(`export_query_failed_${table}`);
            rows.push(...(data ?? []));
            if (!data || data.length < PAGE_SIZE) return rows;
          }
        };

        const [profiles, preferences, trips, tripDays, memories, companions, tripCompanions, places, bucketList] =
          await Promise.all([
            fetchAll("profiles"),
            fetchAll("user_preferences"),
            fetchAll("trips"),
            fetchAll("trip_days"),
            fetchAll("memories"),
            fetchAll("travel_companions"),
            fetchAll("trip_companions"),
            fetchAll("places"),
            fetchAll("bucket_list"),
          ]);

        const exportedAt = new Date();
        const payload = {
          schema_version: 1,
          product: "Golden Atlas",
          generated_at: exportedAt.toISOString(),
          media_included: false,
          media_note: "Private media files are represented by their owned memory metadata and are not embedded in this JSON export.",
          profile: profiles[0] ?? null,
          preferences: preferences[0] ?? null,
          trips,
          trip_days: tripDays,
          memories,
          travel_companions: companions,
          trip_companions: tripCompanions,
          places,
          bucket_list: bucketList,
        };
        const bytes = new TextEncoder().encode(JSON.stringify(payload, null, 2));
        if (bytes.byteLength > MAX_EXPORT_BYTES) throw new Error("export_too_large");

        storagePath = `${userId}/${job.id}/${crypto.randomUUID()}.json`;
        const upload = await ctx.supabaseAdmin.storage
          .from("user-exports")
          .upload(storagePath, bytes, { contentType: "application/json", upsert: false });
        if (upload.error) throw new Error("export_upload_failed");

        const completedAt = new Date();
        const expiresAt = new Date(completedAt.getTime() + EXPORT_TTL_MS);
        const { data: completed, error: completionError } = await ctx.supabaseAdmin
          .from("data_export_jobs")
          .update({
            status: "completed",
            completed_at: completedAt.toISOString(),
            expires_at: expiresAt.toISOString(),
            storage_path: storagePath,
            error_code: null,
          })
          .eq("id", job.id)
          .eq("user_id", userId)
          .eq("status", "processing")
          .select("id,status,requested_at,completed_at,expires_at")
          .single();
        if (completionError || !completed) throw new Error("job_complete_failed");

        logOutcome(requestId, "request-data-export", "success", startedAt);
        return Response.json({ data: completed }, { status: 201 });
      } catch (error) {
        if (storagePath) await ctx.supabaseAdmin.storage.from("user-exports").remove([storagePath]);
        const errorCode = error instanceof Error && error.message === "export_too_large"
          ? "EXPORT_TOO_LARGE"
          : "EXPORT_FAILED";
        await ctx.supabaseAdmin
          .from("data_export_jobs")
          .update({ status: "failed", storage_path: null, error_code: errorCode })
          .eq("id", job.id)
          .eq("user_id", userId);
        logOutcome(requestId, "request-data-export", "failure", startedAt, errorCode);
        return errorResponse(503, errorCode, "The export could not be generated.");
      }
    } catch {
      logOutcome(requestId, "request-data-export", "failure", startedAt, "SERVICE_UNAVAILABLE");
      return errorResponse(503, "SERVICE_UNAVAILABLE", "The export could not be requested.");
    }
  }),
};
