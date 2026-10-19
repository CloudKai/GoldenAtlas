import { Navigate, Outlet } from "react-router";
import { localRepository } from "../lib/local-repository";
import { isSupabaseConfigured } from "../lib/supabase";

export function AdminProtectedRoute() {
  // The prototype admin console reads browser-local data only; it has no meaning (and no safe equivalent) with a hosted backend.
  if (isSupabaseConfigured) return <Navigate to="/" replace />;
  if (!localRepository.hasAdminSession()) return <Navigate to="/admin-login" replace />;
  return <Outlet />;
}
