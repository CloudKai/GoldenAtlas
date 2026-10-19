import { ArrowLeft, Compass, Home } from "lucide-react";
import { useLocation, useNavigate } from "react-router";

export function NotFoundScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  return (
    <div className="flex h-full flex-col items-center justify-center bg-background px-7 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-3xl" style={{ background: "var(--gold-light)", color: "var(--gold)" }}><Compass size={30} /></span>
      <p className="mt-6 text-xs font-bold uppercase tracking-[0.18em]" style={{ color: "var(--gold)" }}>404 · Route not found</p>
      <h1 className="mt-2 text-3xl font-semibold" style={{ color: "var(--foreground)" }}>This path is off the map</h1>
      <p className="mt-3 max-w-xs text-sm leading-6" style={{ color: "var(--muted-foreground)" }}>Golden Atlas does not have a page at <code className="break-all">{location.pathname}</code>.</p>
      <div className="mt-7 grid w-full grid-cols-2 gap-3"><button type="button" onClick={() => navigate("/", { replace: true })} className="flex h-12 items-center justify-center gap-2 rounded-xl font-semibold" style={{ background: "var(--gold)", color: "#1A1814" }}><Home size={17} />Home</button><button type="button" onClick={() => navigate(-1)} className="flex h-12 items-center justify-center gap-2 rounded-xl font-semibold" style={{ border: "1px solid var(--border)", color: "var(--foreground)" }}><ArrowLeft size={17} />Go back</button></div>
    </div>
  );
}
