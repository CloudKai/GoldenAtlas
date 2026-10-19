import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../types/database.generated";
import { publishableKeyProblem } from "./supabase-mappers";

type ViteEnv = { VITE_SUPABASE_URL?: string; VITE_SUPABASE_PUBLISHABLE_KEY?: string };
const env = ((import.meta as ImportMeta & { env?: ViteEnv }).env ?? {}) as ViteEnv;
const url = env.VITE_SUPABASE_URL?.trim() ?? "";
const key = env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ?? "";

/** True when the build has been pointed at a Supabase project; otherwise the local prototype store is used. */
export const isSupabaseConfigured = Boolean(url) && !key.startsWith("replace-with") && key !== "";

/** Reason the configured project must not be used (for example a secret key in browser code). */
export const supabaseConfigProblem: string | null = isSupabaseConfigured ? publishableKeyProblem(key) : null;

/**
 * Auth redirects can fail with `?error=...` or `#error=...`. supabase-js removes callback parameters while it
 * initialises, so they are captured once at import time for the callback screen to explain.
 */
export const initialAuthCallbackError: string | null = (() => {
  if (!isSupabaseConfigured || typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const code = params.get("error_code") ?? hash.get("error_code");
  const raw = params.get("error") ?? hash.get("error");
  if (!code && !raw) return null;
  return code === "otp_expired" ? "This link has expired. Request a new one and try again." : "This link is invalid or has already been used.";
})();

export type AtlasClient = SupabaseClient<Database>;
let client: AtlasClient | undefined;

export function getSupabase(): AtlasClient {
  if (!isSupabaseConfigured) throw new Error("Supabase is not configured.");
  if (supabaseConfigProblem) throw new Error(supabaseConfigProblem);
  client ??= createClient<Database>(url, key, {
    auth: { flowType: "pkce", persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });
  return client;
}
