import type { AtlasBackend } from "./backend";
import { createLocalBackend } from "./local-backend";
import { createSupabaseBackend } from "./supabase-backend";
import { isSupabaseConfigured, supabaseConfigProblem } from "./supabase";

/**
 * Chooses the storage backend for this build. With VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY set the app
 * uses the real authenticated backend; otherwise it runs as the browser-only design prototype.
 */
export function selectBackend(): { backend: AtlasBackend; configError?: string } {
  if (isSupabaseConfigured && supabaseConfigProblem) {
    // Never fall back silently to local storage when a hosted backend was intended.
    return { backend: createLocalBackend(), configError: `Golden Atlas can’t start: ${supabaseConfigProblem}` };
  }
  return { backend: isSupabaseConfigured ? createSupabaseBackend() : createLocalBackend() };
}
