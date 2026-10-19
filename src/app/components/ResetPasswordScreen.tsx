import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { useAppData } from "../contexts/AppDataContext";
import { initialAuthCallbackError } from "../lib/supabase";
import { passwordProblem } from "../lib/supabase-mappers";

/** Landing page for password-reset links. Opening a valid link signs the user in, so only a new password is needed. */
export function ResetPasswordScreen() {
  const navigate = useNavigate();
  const { ready, user, remote, completePasswordReset } = useAppData();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  if (remote && !ready) {
    return <div className="flex h-full items-center justify-center bg-background" role="status"><span style={{ color: "var(--muted-foreground)" }}>Checking your reset link…</span></div>;
  }

  if (!remote || !user || initialAuthCallbackError) {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-background px-8 text-center" role="alert">
        <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-full" style={{ background: "rgba(226,85,85,.1)" }}><AlertCircle size={26} color="#E25555" /></span>
        <h1 style={{ color: "var(--foreground)", fontSize: "21px", fontWeight: 600 }}>This reset link can’t be used</h1>
        <p className="mb-6 mt-2 max-w-[290px]" style={{ color: "var(--muted-foreground)", fontSize: "14px", lineHeight: 1.55 }}>{remote ? initialAuthCallbackError ?? "It may have expired or already been used. Request a new link from the sign-in page." : "Password reset by email needs the hosted Golden Atlas service."}</p>
        <Link to="/signin" replace className="flex h-12 w-full max-w-xs items-center justify-center rounded-xl font-semibold" style={{ background: "var(--gold)", color: "#1A1814" }}>Back to sign in</Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-background px-8 text-center" role="status">
        <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-full" style={{ background: "var(--gold-light)" }}><CheckCircle2 size={26} color="var(--gold)" /></span>
        <h1 style={{ color: "var(--foreground)", fontSize: "21px", fontWeight: 600 }}>Password updated</h1>
        <p className="mb-6 mt-2 max-w-[290px]" style={{ color: "var(--muted-foreground)", fontSize: "14px", lineHeight: 1.55 }}>Your new password is ready to use on every device.</p>
        <button type="button" onClick={() => navigate("/app/map", { replace: true })} className="h-12 w-full max-w-xs rounded-xl font-semibold" style={{ background: "var(--gold)", color: "#1A1814" }}>Continue to your atlas</button>
      </div>
    );
  }

  const submit = async () => {
    const problem = passwordProblem(password);
    if (problem) return setError(problem);
    if (password !== confirmation) return setError("The passwords do not match.");
    setSaving(true);
    setError("");
    try { await completePasswordReset(password); setDone(true); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Your password could not be updated."); }
    finally { setSaving(false); }
  };

  const inputStyle = { background: "var(--input-background)", borderColor: "var(--border)", color: "var(--foreground)", "--tw-ring-color": "var(--gold)" } as React.CSSProperties;

  return (
    <div className="flex h-full flex-col justify-center bg-background px-6">
      <h1 style={{ color: "var(--foreground)", fontSize: "26px", fontWeight: 650, letterSpacing: "-0.03em" }}>Choose a new password</h1>
      <p className="mb-5 mt-1" style={{ color: "var(--muted-foreground)", fontSize: "13px" }}>Use at least 10 characters with letters and numbers.</p>
      {error && <div className="mb-4 flex items-center gap-2 rounded-xl p-3" style={{ background: "rgba(226,85,85,.1)", color: "#E25555" }} role="alert"><AlertCircle size={16} /><span style={{ fontSize: "13px" }}>{error}</span></div>}
      <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); void submit(); }}>
        <label className="block"><span className="mb-1.5 block" style={{ color: "var(--muted-foreground)", fontSize: "12px", fontWeight: 600 }}>New password</span><input type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className="h-12 w-full rounded-xl border px-4 outline-none focus:ring-2" style={inputStyle} /></label>
        <label className="block"><span className="mb-1.5 block" style={{ color: "var(--muted-foreground)", fontSize: "12px", fontWeight: 600 }}>Confirm new password</span><input type="password" autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="h-12 w-full rounded-xl border px-4 outline-none focus:ring-2" style={inputStyle} /></label>
        <button type="submit" disabled={saving} className="mt-2 h-[52px] w-full rounded-xl font-semibold disabled:opacity-60" style={{ background: "var(--gold)", color: "#1A1814" }}>{saving ? "Updating…" : "Update password"}</button>
      </form>
    </div>
  );
}
