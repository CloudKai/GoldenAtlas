import { useState } from "react";
import { useNavigate } from "react-router";
import { AlertCircle, ArrowLeft, Check, CheckCircle2, Eye, EyeOff, Globe2, LockKeyhole } from "lucide-react";
import { useAppData } from "../contexts/AppDataContext";

export function SignUpScreen() {
  const navigate = useNavigate();
  const { register, remote } = useAppData();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [verifyEmail, setVerifyEmail] = useState(false);

  const createAccount = async () => {
    if (!name.trim() || !email || !password) return setError("Complete all fields to create your account.");
    if (!email.includes("@")) return setError("Enter a valid email address.");
    if (password.length < 10) return setError("Use at least 10 characters for your password.");
    if (remote && (!/[A-Za-z]/.test(password) || !/\d/.test(password))) return setError("Include both letters and numbers in your password.");
    if (!accepted) return setError("Review and accept the privacy policy and terms.");
    setError("");
    setLoading(true);
    try {
      const result = await register(name, email, password);
      if (result.verifyEmail) setVerifyEmail(true);
      else navigate("/app/map", { replace: true });
    }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Account creation failed."); }
    finally { setLoading(false); }
  };

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-background">
      <div className="relative h-[25%] min-h-[178px] flex-shrink-0 overflow-hidden">
        <img src="https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=900&q=82&auto=format&fit=crop" alt="Mountain ridge in morning light" className="h-full w-full object-cover" />
        <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(0,0,0,.16), rgba(0,0,0,.66))" }} />
        <button type="button" onClick={() => navigate(-1)} className="absolute left-4 top-12 flex h-11 w-11 items-center justify-center rounded-full text-white" style={{ background: "rgba(0,0,0,.32)", backdropFilter: "blur(8px)" }} aria-label="Back"><ArrowLeft size={20} /></button>
        <div className="absolute bottom-5 left-6 right-6 text-white"><div className="mb-1.5 flex items-center gap-2"><Globe2 size={17} color="var(--gold)" /><span className="text-[10px] font-semibold tracking-[0.18em]">GOLDEN ATLAS</span></div><h1 style={{ fontSize: "27px", fontWeight: 650, letterSpacing: "-0.035em" }}>Create your private atlas</h1></div>
      </div>

      <main className="relative -mt-3 flex-1 overflow-y-auto rounded-t-3xl px-6 pb-7 pt-5" style={{ background: "var(--background)" }}>
        {verifyEmail ? (
          <div className="flex h-full flex-col items-center justify-center pb-12 text-center" role="status">
            <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-full" style={{ background: "var(--gold-light)" }}><CheckCircle2 size={26} color="var(--gold)" /></span>
            <h2 style={{ color: "var(--foreground)", fontSize: "21px", fontWeight: 600 }}>Check your inbox</h2>
            <p className="mb-6 mt-2 max-w-[290px]" style={{ color: "var(--muted-foreground)", fontSize: "14px", lineHeight: 1.55 }}>We sent a confirmation link to {email.trim().toLowerCase()}. Open it to finish creating your account, then sign in.</p>
            <button type="button" onClick={() => navigate("/signin")} className="h-12 w-full rounded-xl font-semibold" style={{ background: "var(--gold)", color: "#1A1814" }}>Go to sign in</button>
          </div>
        ) : (<>
        <div className="mb-4 flex items-start gap-3 rounded-2xl p-3.5" style={{ background: "var(--gold-light)" }}><LockKeyhole size={17} color="var(--gold)" className="mt-0.5 flex-shrink-0" /><p style={{ color: "var(--muted-foreground)", fontSize: "12px", lineHeight: 1.45 }}>Your map and memories are private by default. There is no public profile or social feed.</p></div>
        {error && <div className="mb-4 flex items-center gap-2 rounded-xl p-3" style={{ background: "rgba(226,85,85,.1)", color: "#E25555" }} role="alert"><AlertCircle size={16} /><span style={{ fontSize: "13px" }}>{error}</span></div>}
        <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); createAccount(); }}>
          <label className="block"><span className="mb-1 block" style={{ color: "var(--muted-foreground)", fontSize: "11px", fontWeight: 600 }}>Name</span><input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" placeholder="What should we call you?" className="h-11 w-full rounded-xl border px-4 outline-none focus:ring-2" style={{ background: "var(--input-background)", borderColor: "var(--border)", color: "var(--foreground)", "--tw-ring-color": "var(--gold)" } as React.CSSProperties} /></label>
          <label className="block"><span className="mb-1 block" style={{ color: "var(--muted-foreground)", fontSize: "11px", fontWeight: 600 }}>Email</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" placeholder="you@example.com" className="h-11 w-full rounded-xl border px-4 outline-none focus:ring-2" style={{ background: "var(--input-background)", borderColor: "var(--border)", color: "var(--foreground)", "--tw-ring-color": "var(--gold)" } as React.CSSProperties} /></label>
          <label className="block"><span className="mb-1 block" style={{ color: "var(--muted-foreground)", fontSize: "11px", fontWeight: 600 }}>Password</span><span className="relative block"><input type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" placeholder={remote ? "10+ characters with letters and numbers" : "At least 10 characters"} className="h-11 w-full rounded-xl border px-4 pr-12 outline-none focus:ring-2" style={{ background: "var(--input-background)", borderColor: "var(--border)", color: "var(--foreground)", "--tw-ring-color": "var(--gold)" } as React.CSSProperties} /><button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "var(--muted-foreground)" }} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></span></label>
          <div className="mt-4 flex items-start gap-2.5"><button type="button" onClick={() => setAccepted(!accepted)} className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl" aria-pressed={accepted} aria-label="Accept privacy policy and terms"><span className="flex h-5 w-5 items-center justify-center rounded-md border" style={{ background: accepted ? "var(--gold)" : "transparent", borderColor: accepted ? "var(--gold)" : "var(--border)", color: "#1A1814" }}>{accepted && <Check size={14} strokeWidth={3} />}</span></button><span style={{ color: "var(--muted-foreground)", fontSize: "11px", lineHeight: 1.6 }}>I agree to the <button type="button" onClick={() => navigate("/legal/privacy")} className="underline" style={{ color: "var(--gold)" }}>Privacy Policy</button> and <button type="button" onClick={() => navigate("/legal/terms")} className="underline" style={{ color: "var(--gold)" }}>Terms</button>. {remote ? "Your password is handled by Golden Atlas’s secure sign-in service." : "Passwords are securely derived before local storage."}</span></div>
          <button type="submit" disabled={loading} className="mt-5 h-13 w-full rounded-xl font-semibold disabled:opacity-60" style={{ height: "52px", background: "var(--gold)", color: "#1A1814" }}>{loading ? "Creating account…" : "Create account"}</button>
        </form>
        <p className="mt-4 text-center" style={{ color: "var(--muted-foreground)", fontSize: "12px" }}>Already have an account? <button type="button" onClick={() => navigate("/signin")} style={{ color: "var(--gold)", fontWeight: 600 }}>Sign in</button></p>
        </>)}
      </main>
    </div>
  );
}
