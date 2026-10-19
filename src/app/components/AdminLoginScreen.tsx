import { useEffect, useState } from "react";
import { AlertCircle, ArrowLeft, Eye, EyeOff, LockKeyhole, ShieldCheck } from "lucide-react";
import { Navigate, useNavigate } from "react-router";
import { ADMIN_USERNAME, localRepository } from "../lib/local-repository";
import { isSupabaseConfigured } from "../lib/supabase";

export function AdminLoginScreen() {
  // The prototype admin console only inspects browser-local data, so it is unavailable with a hosted backend.
  return isSupabaseConfigured ? <Navigate to="/" replace /> : <LocalAdminLogin />;
}

function LocalAdminLogin() {
  const navigate = useNavigate();
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [username, setUsername] = useState(ADMIN_USERNAME);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    localRepository.hasAdminAccount()
      .then((value) => { if (active) setConfigured(value); })
      .catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : "Admin storage is unavailable."); });
    return () => { active = false; };
  }, []);

  const submit = async () => {
    if (configured === null) return;
    setError("");
    if (username.trim().toLowerCase() !== ADMIN_USERNAME) return setError("The admin login name is admin.");
    if (!password) return setError("Enter the admin password.");
    if (!configured && password.length < 12) return setError("Use at least 12 characters for the admin password.");
    if (!configured && password !== confirmation) return setError("The passwords do not match.");
    setLoading(true);
    try {
      if (configured) await localRepository.adminSignIn(username, password);
      else await localRepository.setupAdmin(password);
      navigate("/admin", { replace: true });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Admin authentication failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-background px-6 pb-8 pt-12">
      <button type="button" onClick={() => navigate("/signin")} className="flex h-11 w-11 items-center justify-center rounded-full" style={{ background: "var(--card)", color: "var(--foreground)", border: "1px solid var(--border)" }} aria-label="Back to sign in"><ArrowLeft size={20} /></button>

      <main className="my-auto py-8">
        <div className="mb-7 flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: "var(--gold-light)", color: "var(--gold)" }}><ShieldCheck size={27} /></div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--gold)" }}>Golden Atlas administration</p>
        <h1 className="text-3xl font-semibold" style={{ color: "var(--foreground)" }}>{configured === null ? "Preparing admin access…" : configured ? "Admin sign in" : "Set up admin access"}</h1>
        <p className="mt-2 text-sm leading-6" style={{ color: "var(--muted-foreground)" }}>
          {configured === null ? "Checking this device’s local admin configuration." : configured ? "Enter the local administrator credentials for this device." : "Create the administrator password for this device. The password is hashed before it is stored."}
        </p>

        {error && <div className="mt-5 flex items-start gap-2 rounded-xl p-3 text-sm" style={{ background: "rgba(226,85,85,.1)", color: "#E25555" }} role="alert"><AlertCircle className="mt-0.5 shrink-0" size={17} /><span>{error}</span></div>}

        <form className="mt-6 space-y-4" onSubmit={(event) => { event.preventDefault(); void submit(); }}>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold" style={{ color: "var(--muted-foreground)" }}>Admin login</span>
            <span className="relative block"><LockKeyhole className="absolute left-4 top-1/2 -translate-y-1/2" size={18} color="var(--muted-foreground)" /><input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" spellCheck={false} className="h-13 w-full rounded-xl py-3 pl-11 pr-4 outline-none focus:ring-2" style={{ background: "var(--input-background)", color: "var(--foreground)", border: "1px solid var(--border)" }} /></span>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold" style={{ color: "var(--muted-foreground)" }}>Admin password</span>
            <span className="relative block"><input type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={configured ? "current-password" : "new-password"} placeholder={configured ? "Enter admin password" : "At least 12 characters"} className="h-13 w-full rounded-xl px-4 py-3 pr-12 outline-none focus:ring-2" style={{ background: "var(--input-background)", color: "var(--foreground)", border: "1px solid var(--border)" }} /><button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center" style={{ color: "var(--muted-foreground)" }} aria-label={showPassword ? "Hide admin password" : "Show admin password"}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></span>
          </label>
          {configured === false && <label className="block"><span className="mb-1.5 block text-xs font-semibold" style={{ color: "var(--muted-foreground)" }}>Confirm admin password</span><input type={showPassword ? "text" : "password"} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="new-password" placeholder="Repeat admin password" className="h-13 w-full rounded-xl px-4 py-3 outline-none focus:ring-2" style={{ background: "var(--input-background)", color: "var(--foreground)", border: "1px solid var(--border)" }} /></label>}
          <button type="submit" disabled={loading || configured === null} className="mt-2 flex h-13 w-full items-center justify-center rounded-xl font-semibold disabled:opacity-60" style={{ background: "var(--gold)", color: "#1A1814" }}>{loading ? "Please wait…" : configured === false ? "Create admin access" : "Sign in to Admin"}</button>
        </form>

        <p className="mt-5 text-center text-xs leading-5" style={{ color: "var(--muted-foreground)" }}>Local prototype access only. Production administration requires server-enforced roles and audited authentication.</p>
      </main>
    </div>
  );
}
