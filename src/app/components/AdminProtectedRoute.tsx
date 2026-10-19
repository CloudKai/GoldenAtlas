import { Navigate, Outlet } from "react-router";
import { localRepository } from "../lib/local-repository";

export function AdminProtectedRoute() {
  if (!localRepository.hasAdminSession()) return <Navigate to="/admin-login" replace />;
  return <Outlet />;
}
