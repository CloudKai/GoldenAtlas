import { useEffect, useState } from "react";
import { Database, Images, LogOut, MapPinned, ShieldCheck, Users } from "lucide-react";
import { useNavigate } from "react-router";
import { localRepository, type AdminSummary } from "../lib/local-repository";

const cards = [
  { key: "accounts", label: "Local accounts", icon: Users },
  { key: "trips", label: "Recorded trips", icon: MapPinned },
  { key: "photos", label: "Stored photos", icon: Images },
] as const;

export function AdminScreen() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    localRepository.getAdminSummary()
      .then((value) => { if (active) setSummary(value); })
      .catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : "Admin data could not be loaded."); });
    return () => { active = false; };
  }, []);

  const signOut = () => {
    localRepository.clearAdminSession();
    navigate("/admin-login", { replace: true });
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-background px-5 pb-8 pt-12">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: "var(--gold-light)", color: "var(--gold)" }}><ShieldCheck size={23} /></span><div><p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: "var(--gold)" }}>Secure local access</p><h1 className="text-2xl font-semibold" style={{ color: "var(--foreground)" }}>Admin Console</h1></div></div>
        <button type="button" onClick={signOut} className="flex h-11 w-11 items-center justify-center rounded-full" style={{ border: "1px solid var(--border)", color: "var(--muted-foreground)" }} aria-label="Sign out of Admin"><LogOut size={19} /></button>
      </header>

      <main className="mt-8">
        <section className="rounded-3xl p-5" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          <div className="mb-5 flex items-center gap-3"><Database size={20} color="var(--gold)" /><div><h2 className="text-base font-semibold" style={{ color: "var(--foreground)" }}>Local data overview</h2><p className="text-xs" style={{ color: "var(--muted-foreground)" }}>This browser profile only</p></div></div>
          {error ? <p className="rounded-xl p-3 text-sm" style={{ background: "rgba(226,85,85,.1)", color: "#E25555" }} role="alert">{error}</p> : <div className="grid grid-cols-3 gap-2">{cards.map(({ key, label, icon: Icon }) => <div key={key} className="rounded-2xl p-3 text-center" style={{ background: "var(--secondary)" }}><Icon className="mx-auto mb-2" size={19} color="var(--gold)" /><strong className="block text-xl" style={{ color: "var(--foreground)" }}>{summary?.[key] ?? "—"}</strong><span className="mt-1 block text-[10px] leading-4" style={{ color: "var(--muted-foreground)" }}>{label}</span></div>)}</div>}
        </section>

        <section className="mt-5 rounded-3xl p-5" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          <h2 className="text-base font-semibold" style={{ color: "var(--foreground)" }}>Prototype boundary</h2>
          <p className="mt-2 text-sm leading-6" style={{ color: "var(--muted-foreground)" }}>This console reports data saved in this browser. It does not grant hosted Supabase privileges or expose account passwords.</p>
        </section>

        <button type="button" onClick={() => navigate("/signin")} className="mt-6 flex h-12 w-full items-center justify-center rounded-xl font-semibold" style={{ border: "1px solid var(--border)", color: "var(--foreground)" }}>Return to user sign in</button>
      </main>
    </div>
  );
}
