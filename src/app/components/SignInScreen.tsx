import { useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { AlertCircle, ArrowLeft, CheckCircle2, Eye, EyeOff, Globe2, ShieldCheck } from "lucide-react";
import { useAppData } from "../contexts/AppDataContext";

function GoogleIcon() {
  return <svg viewBox="0 0 24 24" className="h-5 w-5"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09Z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06a6.23 6.23 0 0 1-5.84-4.53H2.18v2.84A11 11 0 0 0 12 23Z" fill="#34A853"/><path d="M6.16 14.1A6.6 6.6 0 0 1 5.49 12c0-.73.13-1.43.35-2.09V7.07H2.18A11 11 0 0 0 1 12c0 1.78.43 3.45 1.18 4.93l3.98-2.83Z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A10.6 10.6 0 0 0 12 1a11 11 0 0 0-9.82 6.07l3.66 2.84A6.23 6.23 0 0 1 12 5.38Z" fill="#EA4335"/></svg>;
}

function AppleIcon() {
  return <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39a4.84 4.84 0 0 1 4.12-2.51c1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83ZM13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11Z"/></svg>;
}

export function SignInScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn } = useAppData();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const destination = (location.state as { from?: string } | null)?.from ?? "/app/map";

  const handleSignIn = async () => {
    if (!email || !password) return setError("Enter your email and password to continue.");
    if (!email.includes("@")) return setError("Enter a valid email address.");
    setLoading(true);
    setError("");
    try { await signIn(email, password); navigate(destination, { replace: true }); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Sign in failed."); }
    finally { setLoading(false); }
  };

  const sendReset = () => {
    if (!email.includes("@")) return setError("Enter the email address linked to your account.");
    setError("Email reset links become available after the hosted authentication service is connected. If you are signed in, change your password from Profile.");
  };

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-background">
      <div className="relative h-[31%] min-h-[210px] flex-shrink-0 overflow-hidden">
        <img src="https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=900&q=82&auto=format&fit=crop" alt="Quiet mountain lake" className="h-full w-full object-cover" />
        <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(0,0,0,.18), rgba(0,0,0,.56))" }} />
        <button type="button" onClick={() => resetMode ? setResetMode(false) : navigate(-1)} className="absolute left-4 top-12 flex h-11 w-11 items-center justify-center rounded-full text-white" style={{ background: "rgba(0,0,0,.32)", backdropFilter: "blur(8px)" }} aria-label="Back">
          <ArrowLeft size={20} />
        </button>
        <div className="absolute bottom-5 left-6 right-6 text-white">
          <div className="mb-2 flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-xl" style={{ background: "var(--gold)", color: "#1A1814" }}><Globe2 size={17} /></span><span className="text-xs font-semibold tracking-[0.18em]">GOLDEN ATLAS</span></div>
          <h1 style={{ fontSize: "29px", fontWeight: 650, letterSpacing: "-0.035em" }}>{resetMode ? "Reset your password" : "Welcome back"}</h1>
          <p className="mt-1 text-white/75" style={{ fontSize: "13px" }}>{resetMode ? "We’ll send a secure reset link." : "Your private world is waiting."}</p>
        </div>
      </div>

      <main className="relative -mt-3 flex-1 overflow-y-auto rounded-t-3xl px-6 pb-7 pt-6" style={{ background: "var(--background)" }}>
        {resetSent ? (
          <div className="flex h-full flex-col items-center justify-center pb-12 text-center">
            <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-full" style={{ background: "var(--gold-light)" }}><CheckCircle2 size={26} color="var(--gold)" /></span>
            <h2 style={{ color: "var(--foreground)", fontSize: "21px", fontWeight: 600 }}>Check your inbox</h2>
            <p className="mb-6 mt-2 max-w-[280px]" style={{ color: "var(--muted-foreground)", fontSize: "14px", lineHeight: 1.55 }}>If an account exists for {email}, a password reset link is on its way.</p>
            <button type="button" onClick={() => { setResetMode(false); setResetSent(false); }} className="h-12 w-full rounded-xl font-semibold" style={{ background: "var(--gold)", color: "#1A1814" }}>Back to sign in</button>
          </div>
        ) : (
          <>
            {error && <div className="mb-4 flex items-center gap-2 rounded-xl p-3" style={{ background: "rgba(226,85,85,.1)", color: "#E25555" }} role="alert"><AlertCircle size={16} /><span style={{ fontSize: "13px" }}>{error}</span></div>}
            <form className="space-y-3.5" onSubmit={(event) => { event.preventDefault(); resetMode ? sendReset() : handleSignIn(); }}>
              <label className="block"><span className="mb-1.5 block" style={{ color: "var(--muted-foreground)", fontSize: "12px", fontWeight: 600 }}>Email</span><input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" className="h-12 w-full rounded-xl px-4 outline-none focus:ring-2" style={{ background: "var(--input-background)", color: "var(--foreground)", border: "1px solid var(--border)", "--tw-ring-color": "var(--gold)" } as React.CSSProperties} /></label>
              {!resetMode && <label className="block"><span className="mb-1.5 block" style={{ color: "var(--muted-foreground)", fontSize: "12px", fontWeight: 600 }}>Password</span><span className="relative block"><input type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} onKeyDown={(event) => event.key === "Enter" && handleSignIn()} placeholder="Your password" className="h-12 w-full rounded-xl px-4 pr-12 outline-none focus:ring-2" style={{ background: "var(--input-background)", color: "var(--foreground)", border: "1px solid var(--border)", "--tw-ring-color": "var(--gold)" } as React.CSSProperties} /><button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1" style={{ color: "var(--muted-foreground)" }} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></span></label>}
            {!resetMode && <button type="button" onClick={() => { setResetMode(true); setError(""); }} className="mt-2 block w-full text-right" style={{ color: "var(--gold)", fontSize: "12px", fontWeight: 600 }}>Forgot password?</button>}
            <button type="submit" disabled={loading} className="mt-5 flex h-13 w-full items-center justify-center rounded-xl font-semibold disabled:opacity-60" style={{ height: "52px", background: "var(--gold)", color: "#1A1814" }}>{loading ? "Signing in…" : resetMode ? "Send reset link" : "Sign in"}</button>
            </form>

            {!resetMode && <>
              <div className="my-4 flex items-center gap-3"><span className="h-px flex-1" style={{ background: "var(--border)" }} /><span style={{ color: "var(--muted-foreground)", fontSize: "11px" }}>or continue with</span><span className="h-px flex-1" style={{ background: "var(--border)" }} /></div>
              <div className="grid grid-cols-2 gap-3">
                <button type="button" disabled title="Available after provider setup" className="flex h-12 items-center justify-center gap-2 rounded-xl border opacity-45" style={{ borderColor: "var(--border)", color: "var(--foreground)" }}><GoogleIcon /><span style={{ fontSize: "13px" }}>Google</span></button>
                <button type="button" disabled title="Available after provider setup" className="flex h-12 items-center justify-center gap-2 rounded-xl border opacity-45" style={{ borderColor: "var(--border)", color: "var(--foreground)" }}><AppleIcon /><span style={{ fontSize: "13px" }}>Apple</span></button>
              </div>
              <p className="mt-2 text-center text-[11px]" style={{ color: "var(--muted-foreground)" }}>Google and Apple are available after provider setup.</p>
              <p className="mt-5 text-center" style={{ color: "var(--muted-foreground)", fontSize: "13px" }}>New to Golden Atlas? <button type="button" onClick={() => navigate("/signup")} style={{ color: "var(--gold)", fontWeight: 600 }}>Create account</button></p>
              <button type="button" onClick={() => navigate("/admin-login")} className="mx-auto mt-3 flex min-h-11 items-center justify-center gap-2 px-4 text-xs font-semibold" style={{ color: "var(--muted-foreground)" }}><ShieldCheck size={15} />Admin access</button>
            </>}
          </>
        )}
      </main>
    </div>
  );
}
