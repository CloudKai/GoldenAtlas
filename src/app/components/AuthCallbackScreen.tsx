import { useEffect } from "react";
import { Link, useNavigate } from "react-router";
import { AlertCircle } from "lucide-react";
import { useAppData } from "../contexts/AppDataContext";
import { initialAuthCallbackError } from "../lib/supabase";

/** Landing page for email-confirmation links. The auth client exchanges the code while the app starts. */
export function AuthCallbackScreen() {
  const navigate = useNavigate();
  const { ready, user, remote } = useAppData();
  const failure = !remote ? "Email links only work with the hosted Golden Atlas service." : initialAuthCallbackError;

  useEffect(() => {
    if (!failure && ready && user) navigate("/app/map", { replace: true });
  }, [failure, ready, user, navigate]);

  if (!failure && !(ready && !user)) {
    return <div className="flex h-full items-center justify-center bg-background" role="status"><span style={{ color: "var(--muted-foreground)" }}>Confirming your email…</span></div>;
  }

  return (
    <div className="flex h-full flex-col items-center justify-center bg-background px-8 text-center" role="alert">
      <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-full" style={{ background: "rgba(226,85,85,.1)" }}><AlertCircle size={26} color="#E25555" /></span>
      <h1 style={{ color: "var(--foreground)", fontSize: "21px", fontWeight: 600 }}>We couldn’t confirm that link</h1>
      <p className="mb-6 mt-2 max-w-[290px]" style={{ color: "var(--muted-foreground)", fontSize: "14px", lineHeight: 1.55 }}>{failure ?? "This link is invalid, expired, or already used. Sign in, or request a new link."}</p>
      <Link to="/signin" replace className="flex h-12 w-full max-w-xs items-center justify-center rounded-xl font-semibold" style={{ background: "var(--gold)", color: "#1A1814" }}>Go to sign in</Link>
    </div>
  );
}
