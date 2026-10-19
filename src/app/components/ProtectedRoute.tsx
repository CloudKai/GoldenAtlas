import { Navigate, Outlet, useLocation } from "react-router";
import { useAppData } from "../contexts/AppDataContext";

export function ProtectedRoute() {
  const { ready, user, storageError } = useAppData();
  const location = useLocation();
  if (!ready) return <div className="flex h-full items-center justify-center bg-background" role="status"><span style={{ color: "var(--muted-foreground)" }}>Opening your private atlas…</span></div>;
  if (storageError) return <div className="flex h-full flex-col items-center justify-center bg-background px-8 text-center" role="alert"><h1 className="text-xl font-semibold">Golden Atlas can’t open right now</h1><p className="mt-2 text-sm" style={{ color: "var(--muted-foreground)" }}>{storageError}</p></div>;
  if (!user) return <Navigate to="/signin" replace state={{ from: `${location.pathname}${location.search}` }} />;
  return <Outlet />;
}
