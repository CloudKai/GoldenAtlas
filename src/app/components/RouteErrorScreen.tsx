import { AlertTriangle, RotateCcw } from "lucide-react";
import { isRouteErrorResponse, useRouteError } from "react-router";

export function RouteErrorScreen() {
  const error = useRouteError();
  const status = isRouteErrorResponse(error) ? error.status : 500;
  return <div className="flex h-full flex-col items-center justify-center bg-background px-7 text-center" role="alert"><span className="flex h-16 w-16 items-center justify-center rounded-3xl" style={{ background: "rgba(226,85,85,.1)", color: "#E25555" }}><AlertTriangle size={29} /></span><p className="mt-6 text-xs font-bold uppercase tracking-[0.18em]" style={{ color: "#E25555" }}>{status} · Application error</p><h1 className="mt-2 text-3xl font-semibold" style={{ color: "var(--foreground)" }}>Something went off course</h1><p className="mt-3 max-w-xs text-sm leading-6" style={{ color: "var(--muted-foreground)" }}>Your locally saved atlas has not been changed. Reload the page or return home.</p><div className="mt-7 grid w-full grid-cols-2 gap-3"><button type="button" onClick={() => window.location.reload()} className="flex h-12 items-center justify-center gap-2 rounded-xl font-semibold" style={{ background: "var(--gold)", color: "#1A1814" }}><RotateCcw size={17} />Reload</button><a href="/" className="flex h-12 items-center justify-center rounded-xl font-semibold" style={{ border: "1px solid var(--border)", color: "var(--foreground)" }}>Return home</a></div></div>;
}
