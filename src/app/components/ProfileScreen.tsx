import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router";
import {
  Accessibility,
  AlertTriangle,
  Camera,
  Check,
  ChevronRight,
  CircleHelp,
  Download,
  FileText,
  Globe2,
  HardDrive,
  Image,
  Info,
  KeyRound,
  LockKeyhole,
  LogOut,
  MapPin,
  Palette,
  Pencil,
  Play,
  Shield,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { useTheme, type ThemePreference } from "../contexts/ThemeContext";
import { useAppData } from "../contexts/AppDataContext";
import {
  getImageQuality,
  getSlideshowPreferences,
  saveImageQuality,
  saveSlideshowPreferences,
  type ImageQuality,
  type SlideshowOrder,
  type SlideshowPreferences,
  type SlideshowTransition,
} from "../lib/preferences";

type ActivePanel =
  | "edit-profile"
  | "theme"
  | "slide-duration"
  | "transition"
  | "order"
  | "image-quality"
  | "privacy"
  | "change-password"
  | "help"
  | "terms"
  | "about"
  | "delete-account"
  | null;

interface ProfileDetails {
  name: string;
  email: string;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}

function SectionHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="px-1 pb-2 pt-6">
      <p className="uppercase tracking-[0.16em]" style={{ fontSize: "10px", fontWeight: 700, color: "var(--muted-foreground)" }}>
        {title}
      </p>
      {description && <p className="mt-1" style={{ color: "var(--muted-foreground)", fontSize: "11px", lineHeight: 1.4 }}>{description}</p>}
    </div>
  );
}

function SettingsCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`overflow-hidden rounded-2xl border ${className}`} style={{ background: "var(--card)", borderColor: "var(--border)" }}>
      {children}
    </div>
  );
}

function SettingRow({ icon: Icon, label, description, value, onPress, danger = false }: {
  icon: typeof ChevronRight;
  label: string;
  description?: string;
  value?: string;
  onPress: () => void;
  danger?: boolean;
}) {
  const colour = danger ? "#E25555" : "var(--gold)";
  return (
    <button
      type="button"
      onClick={onPress}
      className="flex min-h-[64px] w-full items-center gap-3 border-b px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-accent active:opacity-75"
      style={{ borderColor: "var(--border)" }}
    >
      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl" style={{ background: `color-mix(in srgb, ${colour} 14%, transparent)` }}>
        <Icon size={17} color={colour} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block" style={{ color: danger ? "#E25555" : "var(--foreground)", fontSize: "14px", fontWeight: 550 }}>{label}</span>
        {description && <span className="mt-0.5 block" style={{ color: "var(--muted-foreground)", fontSize: "11px", lineHeight: 1.35 }}>{description}</span>}
      </span>
      {value && <span className="max-w-[30%] truncate text-right" style={{ color: "var(--muted-foreground)", fontSize: "12px", fontWeight: 500 }}>{value}</span>}
      <ChevronRight size={16} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} aria-hidden="true" />
    </button>
  );
}

function Toggle({ value, onChange, label }: { value: boolean; onChange: (value: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-label={label}
      aria-checked={value}
      onClick={() => onChange(!value)}
      className="relative h-11 w-14 flex-shrink-0 rounded-full focus-visible:ring-2 focus-visible:ring-gold"
    >
      <span className="absolute left-1 top-2 h-7 w-12 rounded-full transition-colors" style={{ background: value ? "var(--gold)" : "var(--switch-background)" }}>
        <span className="absolute left-0 top-0.5 h-6 w-6 rounded-full bg-white shadow-sm transition-transform" style={{ transform: value ? "translateX(22px)" : "translateX(2px)" }} />
      </span>
    </button>
  );
}

function ToggleRow({ icon: Icon, label, description, value, onChange }: {
  icon: typeof ChevronRight;
  label: string;
  description: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex min-h-[68px] items-center gap-3 border-b px-4 py-3 last:border-b-0" style={{ borderColor: "var(--border)" }}>
      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl" style={{ background: "var(--gold-light)" }}>
        <Icon size={17} color="var(--gold)" />
      </span>
      <div className="min-w-0 flex-1">
        <p style={{ color: "var(--foreground)", fontSize: "14px", fontWeight: 550 }}>{label}</p>
        <p className="mt-0.5" style={{ color: "var(--muted-foreground)", fontSize: "11px", lineHeight: 1.35 }}>{description}</p>
      </div>
      <Toggle value={value} onChange={onChange} label={label} />
    </div>
  );
}

function Sheet({ title, description, onClose, children }: { title: string; description?: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="absolute inset-0 z-[70] flex flex-col justify-end" style={{ background: "rgba(0,0,0,0.66)" }} onClick={onClose}>
      <section
        className="max-h-[86%] overflow-y-auto rounded-t-3xl border-t px-5 pb-6 pt-3 shadow-2xl"
        style={{ background: "var(--card)", borderColor: "var(--border)" }}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="mb-4 flex justify-center"><div className="h-1 w-10 rounded-full" style={{ background: "var(--muted)" }} /></div>
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 style={{ color: "var(--foreground)", fontSize: "20px", fontWeight: 650, letterSpacing: "-0.02em" }}>{title}</h2>
            {description && <p className="mt-1" style={{ color: "var(--muted-foreground)", fontSize: "12px", lineHeight: 1.45 }}>{description}</p>}
          </div>
          <button type="button" onClick={onClose} className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full" style={{ background: "var(--muted)", color: "var(--foreground)" }} aria-label="Close">
            <X size={17} />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

function ChoiceList<T extends string>({ values, selected, onSelect, descriptionFor }: {
  values: readonly T[];
  selected: T;
  onSelect: (value: T) => void;
  descriptionFor?: (value: T) => string;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border" style={{ borderColor: "var(--border)" }}>
      {values.map((value) => (
        <button
          type="button"
          key={value}
          onClick={() => onSelect(value)}
          className="flex min-h-[60px] w-full items-center justify-between gap-3 border-b px-4 py-3 text-left last:border-b-0"
          style={{ borderColor: "var(--border)", color: "var(--foreground)", background: value === selected ? "var(--gold-light)" : "transparent" }}
          aria-pressed={value === selected}
        >
          <span className="min-w-0 flex-1">
            <span className="block" style={{ fontSize: "14px", fontWeight: 550 }}>{value}</span>
            {descriptionFor && <span className="mt-0.5 block" style={{ color: "var(--muted-foreground)", fontSize: "11px" }}>{descriptionFor(value)}</span>}
          </span>
          <span className="flex h-6 w-6 items-center justify-center rounded-full border" style={{ borderColor: value === selected ? "var(--gold)" : "var(--border)", background: value === selected ? "var(--gold)" : "transparent" }}>
            {value === selected && <Check size={13} color="#1A1814" strokeWidth={3} />}
          </span>
        </button>
      ))}
    </div>
  );
}

function ChangePasswordForm({ onComplete, changePassword, isDemo, remote }: { onComplete: (message: string) => void; changePassword: (currentPassword: string, newPassword: string) => Promise<void>; isDemo: boolean; remote: boolean }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");

  const submit = async () => {
    if (!currentPassword) return setError("Enter your current password.");
    if (newPassword.length < 10) return setError("Your new password must contain at least 10 characters.");
    if (newPassword !== confirmation) return setError("The new passwords do not match.");
    try { await changePassword(currentPassword, newPassword); onComplete("Password updated"); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Password could not be updated."); }
  };

  return (
    <div className="space-y-3">
      <label className="block"><span className="mb-1.5 block" style={{ color: "var(--muted-foreground)", fontSize: "11px", fontWeight: 600 }}>Current password</span><input type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} autoComplete="current-password" className="h-12 w-full rounded-xl border px-4 outline-none focus:ring-2" style={{ background: "var(--input-background)", borderColor: "var(--border)", color: "var(--foreground)", "--tw-ring-color": "var(--gold)" } as React.CSSProperties} /></label>
      <label className="block"><span className="mb-1.5 block" style={{ color: "var(--muted-foreground)", fontSize: "11px", fontWeight: 600 }}>New password</span><input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} autoComplete="new-password" className="h-12 w-full rounded-xl border px-4 outline-none focus:ring-2" style={{ background: "var(--input-background)", borderColor: "var(--border)", color: "var(--foreground)", "--tw-ring-color": "var(--gold)" } as React.CSSProperties} /></label>
      <label className="block"><span className="mb-1.5 block" style={{ color: "var(--muted-foreground)", fontSize: "11px", fontWeight: 600 }}>Confirm new password</span><input type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="new-password" className="h-12 w-full rounded-xl border px-4 outline-none focus:ring-2" style={{ background: "var(--input-background)", borderColor: "var(--border)", color: "var(--foreground)", "--tw-ring-color": "var(--gold)" } as React.CSSProperties} /></label>
      {error && <p role="alert" style={{ color: "#E25555", fontSize: "12px" }}>{error}</p>}
      <p style={{ color: "var(--muted-foreground)", fontSize: "11px", lineHeight: 1.45 }}>{isDemo ? "The shared demo account cannot change its password." : remote ? "Use at least 10 characters with letters and numbers. You will stay signed in on this device." : "Use at least 10 characters. The derived password is updated in this browser without storing plaintext."}</p>
      <button type="button" disabled={isDemo} onClick={submit} className="h-12 w-full rounded-xl font-semibold disabled:opacity-40" style={{ background: "var(--gold)", color: "#1A1814" }}>Update password</button>
    </div>
  );
}

function DeleteAccountForm({ onDelete, onCancel, remote }: { onDelete: (password: string) => Promise<void>; onCancel: () => void; remote: boolean }) {
  const [confirmation, setConfirmation] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const inputStyle = { background: "var(--input-background)", borderColor: "var(--border)", color: "var(--foreground)", "--tw-ring-color": "#E25555" } as React.CSSProperties;
  const submit = async () => {
    setBusy(true);
    setError("");
    try { await onDelete(password); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Your account could not be deleted. Nothing further has been removed; try again."); setBusy(false); }
  };
  return (
    <div>
      <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full" style={{ background: "rgba(226,85,85,0.12)" }}><AlertTriangle size={24} color="#E25555" /></span>
      <p className="mb-4 text-center" style={{ color: "var(--muted-foreground)", fontSize: "13px", lineHeight: 1.55 }}>Deletion is permanent. {remote ? "This removes your account, trips, journals and every stored photo from Golden Atlas. Consider downloading your data first." : <>Enter <strong style={{ color: "var(--foreground)" }}>DELETE</strong> to remove this local account, its trips and stored photo blobs from this browser.</>}</p>
      {remote && <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Confirm your password" autoComplete="current-password" aria-label="Confirm your password" className="mb-3 h-12 w-full rounded-xl border px-4 text-center outline-none focus:ring-2" style={inputStyle} />}
      <input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder="Type DELETE" autoCapitalize="characters" aria-label="Type DELETE to confirm" className="mb-3 h-12 w-full rounded-xl border px-4 text-center outline-none focus:ring-2" style={inputStyle} />
      {error && <p role="alert" className="mb-3 text-center" style={{ color: "#E25555", fontSize: "12px" }}>{error}</p>}
      <button type="button" disabled={confirmation !== "DELETE" || busy || (remote && !password)} onClick={submit} className="mb-2 h-12 w-full rounded-xl font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40" style={{ background: "#C74444" }}>{busy ? "Deleting…" : "Delete account"}</button>
      <button type="button" disabled={busy} onClick={onCancel} className="h-12 w-full rounded-xl font-medium disabled:opacity-40" style={{ background: "var(--muted)", color: "var(--foreground)" }}>Cancel</button>
    </div>
  );
}

export function ProfileScreen() {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { user, state, statistics, updateProfile, changePassword, signOut: endSession, deleteAccount, remote, exportData } = useAppData();
  const [panel, setPanel] = useState<ActivePanel>(null);
  const [slideshow, setSlideshow] = useState<SlideshowPreferences>(getSlideshowPreferences);
  const [imageQuality, setImageQuality] = useState<ImageQuality>(getImageQuality);
  const [removeLocation, setRemoveLocation] = useState(() => localStorage.getItem("golden-atlas:remove-location") !== "false");
  const [analytics, setAnalytics] = useState(() => localStorage.getItem("golden-atlas:analytics") === "true");
  const [reducedMotion, setReducedMotion] = useState(() => localStorage.getItem("golden-atlas:reduced-motion") === "true");
  const [cacheSize, setCacheSize] = useState("Checking…");
  const [notice, setNotice] = useState("");
  const [profile, setProfile] = useState<ProfileDetails>(() => ({ name: user?.name ?? "Traveller", email: user?.email ?? "" }));
  const [draftProfile, setDraftProfile] = useState(profile);
  const [profileError, setProfileError] = useState("");
  const photoCount = statistics?.totalPhotos ?? 0;

  useEffect(() => { if (user) { const next = { name: user.name, email: user.email }; setProfile(next); setDraftProfile(next); } }, [user]);
  useEffect(() => { navigator.storage?.estimate().then(({ usage }) => setCacheSize(formatBytes(usage ?? 0))).catch(() => setCacheSize("Unavailable")); }, [state?.updatedAt]);

  useEffect(() => {
    document.documentElement.classList.toggle("reduce-motion", reducedMotion);
    localStorage.setItem("golden-atlas:reduced-motion", String(reducedMotion));
  }, [reducedMotion]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 2400);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const openProfileEditor = () => {
    setDraftProfile(profile);
    setProfileError("");
    setPanel("edit-profile");
  };

  const saveProfile = async () => {
    const name = draftProfile.name.trim();
    const email = draftProfile.email.trim();
    if (!name) return setProfileError("Enter your name.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setProfileError("Enter a valid email address.");
    const next = { name, email };
    try { const message = await updateProfile(name, email); setProfile(next); setPanel(null); setNotice(message ?? "Profile updated"); }
    catch (reason) { setProfileError(reason instanceof Error ? reason.message : "Profile could not be updated."); }
  };

  const updateSlideshow = (next: Partial<SlideshowPreferences>) => {
    const preferences = { ...slideshow, ...next };
    setSlideshow(preferences);
    saveSlideshowPreferences(preferences);
    setPanel(null);
  };

  const saveBlob = (blob: Blob) => {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "golden-atlas-export.json";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const downloadData = async () => {
    if (exportData) {
      setNotice("Preparing your export…");
      try { saveBlob(await exportData()); setNotice("Export downloaded. Its link expires shortly."); }
      catch (reason) { setNotice(reason instanceof Error ? reason.message : "The export could not be prepared."); }
      return;
    }
    const payload = {
      exportedAt: new Date().toISOString(),
      profile,
      account: user,
      atlas: state ? { ...state, trips: state.trips.map((trip) => ({ ...trip, photos: trip.photos.map(({ url, thumbnailUrl, ...photo }) => ({ ...photo, source: url.startsWith("data:") ? "local" : "linked", hasThumbnail: Boolean(thumbnailUrl) })) })) } : null,
      preferences: { theme, slideshow, imageQuality, removeLocation, analytics, reducedMotion },
      note: "Local prototype export. Photo binary data is not embedded; photo metadata is included.",
    };
    saveBlob(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }));
    setNotice("Export prepared");
  };

  const signOut = () => {
    endSession();
    navigate("/", { replace: true });
  };

  const finishPanelAction = (message: string) => {
    setPanel(null);
    setNotice(message);
  };

  return (
    <div className="relative flex h-full flex-col bg-background">
      <header className="flex-shrink-0 border-b px-5 pb-3 pt-4" style={{ borderColor: "var(--border)" }}>
        <div className="mx-auto w-full max-w-2xl">
          <p className="mb-0.5 uppercase tracking-[0.18em]" style={{ color: "var(--gold)", fontSize: "9px", fontWeight: 750 }}>Your account</p>
          <h1 style={{ color: "var(--foreground)", fontSize: "24px", fontWeight: 650, letterSpacing: "-0.03em" }}>Profile</h1>
        </div>
      </header>

      <div className="scrollbar-hidden mx-auto w-full max-w-2xl flex-1 overflow-y-auto px-5 pb-8">
        <section className="mt-4 overflow-hidden rounded-3xl border" style={{ background: "var(--card)", borderColor: "var(--border)" }} aria-label="Profile summary">
          <div className="flex items-center gap-3 p-4">
            <div className="relative flex-shrink-0">
              {user?.avatarUrl ? <img src={user.avatarUrl} alt="" className="h-16 w-16 rounded-2xl object-cover" /> : <span className="flex h-16 w-16 items-center justify-center rounded-2xl text-lg font-bold" style={{ background: "var(--gold-light)", color: "var(--gold)" }}>{profile.name.split(/\s+/).map((part) => part[0]).join("").slice(0,2).toUpperCase()}</span>}
              <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2" style={{ background: "var(--gold)", borderColor: "var(--card)", color: "#1A1814", fontSize: "9px", fontWeight: 800 }}>✓</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate" style={{ color: "var(--foreground)", fontSize: "18px", fontWeight: 650 }}>{profile.name}</p>
              <p className="mt-0.5 truncate" style={{ color: "var(--muted-foreground)", fontSize: "12px" }}>{profile.email}</p>
              <p className="mt-1" style={{ color: "var(--gold)", fontSize: "10px", fontWeight: 650 }}>Private traveller profile</p>
            </div>
            <button type="button" onClick={openProfileEditor} className="flex h-11 items-center gap-1.5 rounded-xl border px-3 transition-colors hover:bg-accent" style={{ borderColor: "var(--border)", color: "var(--foreground)", fontSize: "12px", fontWeight: 600 }}>
              <Pencil size={13} /> Edit
            </button>
          </div>
          <div className="grid grid-cols-3 border-t" style={{ borderColor: "var(--border)" }}>
            {[
              { icon: Globe2, value: statistics?.countriesVisited ?? 0, label: "Countries" },
              { icon: MapPin, value: statistics?.totalTrips ?? 0, label: "Trips" },
              { icon: Camera, value: photoCount, label: "Photos" },
            ].map(({ icon: Icon, value, label }, index) => (
              <div key={label} className="flex flex-col items-center py-3" style={{ borderLeft: index ? "1px solid var(--border)" : undefined }}>
                <div className="flex items-center gap-1.5"><Icon size={12} style={{ color: "var(--gold)" }} /><span style={{ color: "var(--foreground)", fontSize: "14px", fontWeight: 700 }}>{value}</span></div>
                <span className="mt-0.5" style={{ color: "var(--muted-foreground)", fontSize: "9px", fontWeight: 550 }}>{label}</span>
              </div>
            ))}
          </div>
        </section>

        <SectionHeader title="Account" description="Personal details and sign-in security" />
        <SettingsCard>
          <SettingRow icon={UserRound} label="Personal information" description="Name and email address" value={profile.name.split(" ")[0]} onPress={openProfileEditor} />
          <SettingRow icon={LockKeyhole} label="Password & security" description="Update your account password" onPress={() => setPanel("change-password")} />
        </SettingsCard>

        <SectionHeader title="App preferences" description="Control how Golden Atlas looks and behaves" />
        <SettingsCard>
          <SettingRow icon={Palette} label="Appearance" description="Follow your device or choose a theme" value={{ system: "System", light: "Light", dark: "Dark" }[theme]} onPress={() => setPanel("theme")} />
          <ToggleRow icon={Accessibility} label="Reduce motion" description="Use simpler, shorter transitions" value={reducedMotion} onChange={setReducedMotion} />
        </SettingsCard>

        <SectionHeader title="Slideshow" description="Defaults used when revisiting your memories" />
        <SettingsCard>
          <SettingRow icon={Play} label="Slide duration" description="Time each memory remains visible" value={`${slideshow.duration}s`} onPress={() => setPanel("slide-duration")} />
          <SettingRow icon={Play} label="Transition style" description="Animation between memories" value={slideshow.transition} onPress={() => setPanel("transition")} />
          <SettingRow icon={Play} label="Memory order" description="How a slideshow begins" value={slideshow.order} onPress={() => setPanel("order")} />
        </SettingsCard>

        <SectionHeader title="Photos & storage" description="Balance image quality and device space" />
        <div className="mb-2 rounded-2xl border p-4" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
          <div className="mb-2 flex items-center justify-between">
            <div><p style={{ color: "var(--foreground)", fontSize: "13px", fontWeight: 600 }}>Local app storage</p><p style={{ color: "var(--muted-foreground)", fontSize: "10px" }}>IndexedDB, photos and preferences on this device</p></div>
            <p style={{ color: "var(--foreground)", fontSize: "13px", fontWeight: 700 }}>{cacheSize}</p>
          </div>
          <p className="mt-2" style={{ color: "var(--muted-foreground)", fontSize: "10px" }}>Browser estimates can include temporary resources and may vary by device.</p>
        </div>
        <SettingsCard>
          <SettingRow icon={Image} label="Image quality" description="Quality used for saved photos" value={imageQuality} onPress={() => setPanel("image-quality")} />
          <SettingRow icon={HardDrive} label="Clear local cache" description="Remove temporary browser caches, never trips or photos" value={cacheSize} onPress={async () => { if ("caches" in window) await Promise.all((await caches.keys()).map((key) => caches.delete(key))); setNotice("Temporary cache cleared"); const estimate = await navigator.storage?.estimate(); setCacheSize(formatBytes(estimate?.usage ?? 0)); }} />
        </SettingsCard>

        <SectionHeader title="Privacy & data" description="Your travel history stays private by default" />
        <SettingsCard>
          <ToggleRow icon={MapPin} label="Remove exact location" description="Strip GPS metadata before upload" value={removeLocation} onChange={(value) => { setRemoveLocation(value); localStorage.setItem("golden-atlas:remove-location", String(value)); }} />
          <ToggleRow icon={Shield} label="Anonymous analytics" description="Share anonymous app-performance data" value={analytics} onChange={(value) => { setAnalytics(value); localStorage.setItem("golden-atlas:analytics", String(value)); }} />
          <SettingRow icon={Download} label="Download your data" description={remote ? "Prepare a private JSON export (link expires in minutes)" : "Prepare a private JSON export"} onPress={downloadData} />
          <SettingRow icon={Shield} label="Privacy policy" description="How Golden Atlas protects your data" onPress={() => navigate("/legal/privacy")} />
        </SettingsCard>

        <SectionHeader title="Help & legal" />
        <SettingsCard>
          <SettingRow icon={CircleHelp} label="Help & support" description="Answers and contact options" onPress={() => setPanel("help")} />
          <SettingRow icon={FileText} label="Terms of service" description="Rules for using Golden Atlas" onPress={() => navigate("/legal/terms")} />
          <SettingRow icon={Info} label="About Golden Atlas" description="Version, credits and licenses" value="0.1.0" onPress={() => setPanel("about")} />
        </SettingsCard>

        <SectionHeader title="Session" />
        <SettingsCard className="mb-6">
          <SettingRow icon={LogOut} label="Sign out" description="Sign out on this device" onPress={signOut} />
          <SettingRow icon={Trash2} label="Delete account" description="Permanently remove your account and data" danger onPress={() => setPanel("delete-account")} />
        </SettingsCard>
      </div>

      {notice && <div className="absolute bottom-4 left-1/2 z-[80] -translate-x-1/2 whitespace-nowrap rounded-full px-4 py-2 shadow-xl" style={{ background: "var(--foreground)", color: "var(--background)", fontSize: "12px", fontWeight: 550 }} role="status">{notice}</div>}

      {panel === "theme" && <Sheet title="Appearance" description="Choose how Golden Atlas looks on this device." onClose={() => setPanel(null)}><ChoiceList values={["System", "Light", "Dark"] as const} selected={{ system: "System", light: "Light", dark: "Dark" }[theme]} descriptionFor={(value) => ({ System: "Match your device setting", Light: "Always use the light theme", Dark: "Always use the dark theme" })[value]} onSelect={(value) => { setTheme(value.toLowerCase() as ThemePreference); setPanel(null); }} /></Sheet>}
      {panel === "slide-duration" && <Sheet title="Slide duration" description="This timer resets whenever you move to another image." onClose={() => setPanel(null)}><ChoiceList values={["3 seconds", "5 seconds", "8 seconds", "12 seconds"]} selected={`${slideshow.duration} seconds`} onSelect={(value) => updateSlideshow({ duration: Number(value.split(" ")[0]) })} /></Sheet>}
      {panel === "transition" && <Sheet title="Transition style" description="Choose the animation used between memories." onClose={() => setPanel(null)}><ChoiceList<SlideshowTransition> values={["Fade", "Dissolve", "None"]} selected={slideshow.transition} onSelect={(value) => updateSlideshow({ transition: value })} /></Sheet>}
      {panel === "order" && <Sheet title="Memory order" description="Choose the initial order for every slideshow." onClose={() => setPanel(null)}><ChoiceList<SlideshowOrder> values={["Chronological", "Newest first", "Shuffle"]} selected={slideshow.order} onSelect={(value) => updateSlideshow({ order: value })} /></Sheet>}
      {panel === "image-quality" && <Sheet title="Image quality" description="Choose how much space photos use on this device." onClose={() => setPanel(null)}><ChoiceList<ImageQuality> values={["Original", "High", "Optimised"]} selected={imageQuality} descriptionFor={(value) => ({ Original: "Maximum quality and storage use", High: "Excellent quality with smaller files", Optimised: "Smallest files for everyday viewing" })[value]} onSelect={(value) => { setImageQuality(value); saveImageQuality(value); setPanel(null); }} /></Sheet>}
      {panel === "privacy" && <Sheet title="Privacy by default" description="A private diary, not a public social profile." onClose={() => setPanel(null)}><div className="space-y-4" style={{ color: "var(--muted-foreground)", fontSize: "13px", lineHeight: 1.6 }}><p>Your map, trips, photos and journal entries are private to your account. Golden Atlas does not include a public profile or social feed.</p><p>Private image links expire and are never saved as permanent public URLs. Exact GPS metadata is removed by the client when the privacy setting is enabled.</p><div className="rounded-2xl p-4" style={{ background: "var(--muted)" }}><p style={{ color: "var(--foreground)", fontWeight: 650 }}>Prototype limitation</p><p className="mt-1">The hosted privacy policy and complete account-deletion orchestration remain deployment milestones.</p></div></div></Sheet>}
      {panel === "edit-profile" && <Sheet title="Personal information" description="Keep your account details accurate and up to date." onClose={() => setPanel(null)}><div className="space-y-4"><label className="block"><span className="mb-1.5 block" style={{ color: "var(--muted-foreground)", fontSize: "11px", fontWeight: 600 }}>Full name</span><input value={draftProfile.name} onChange={(event) => setDraftProfile({ ...draftProfile, name: event.target.value })} autoComplete="name" className="h-12 w-full rounded-xl border px-4 outline-none focus:ring-2" style={{ background: "var(--input-background)", borderColor: "var(--border)", color: "var(--foreground)", "--tw-ring-color": "var(--gold)" } as React.CSSProperties} /></label><label className="block"><span className="mb-1.5 block" style={{ color: "var(--muted-foreground)", fontSize: "11px", fontWeight: 600 }}>Email address</span><input type="email" value={draftProfile.email} onChange={(event) => setDraftProfile({ ...draftProfile, email: event.target.value })} autoComplete="email" className="h-12 w-full rounded-xl border px-4 outline-none focus:ring-2" style={{ background: "var(--input-background)", borderColor: "var(--border)", color: "var(--foreground)", "--tw-ring-color": "var(--gold)" } as React.CSSProperties} /></label>{profileError && <p role="alert" style={{ color: "#E25555", fontSize: "12px" }}>{profileError}</p>}<button type="button" onClick={saveProfile} className="h-12 w-full rounded-xl font-semibold" style={{ background: "var(--gold)", color: "#1A1814" }}>Save changes</button></div></Sheet>}
      {panel === "change-password" && <Sheet title="Password & security" description="Choose a strong password you do not use elsewhere." onClose={() => setPanel(null)}><ChangePasswordForm isDemo={Boolean(user?.isDemo)} remote={remote} changePassword={changePassword} onComplete={finishPanelAction} /></Sheet>}
      {panel === "help" && <Sheet title="Help & support" description="Quick answers for the most common questions." onClose={() => setPanel(null)}><div className="space-y-3">{[{ q: "How do I add another city?", a: "Open Add trip and add each city as a separate stop." }, { q: "Who can see my memories?", a: "Only you. Golden Atlas has no public profile or social feed." }, { q: "Why is a photo location missing?", a: "Exact GPS metadata is removed by default for privacy." }].map(({ q, a }) => <div key={q} className="rounded-2xl border p-4" style={{ borderColor: "var(--border)" }}><p style={{ color: "var(--foreground)", fontSize: "13px", fontWeight: 650 }}>{q}</p><p className="mt-1" style={{ color: "var(--muted-foreground)", fontSize: "12px", lineHeight: 1.5 }}>{a}</p></div>)}<button type="button" onClick={() => finishPanelAction("Support request noted for client integration")} className="h-12 w-full rounded-xl border font-semibold" style={{ borderColor: "var(--border)", color: "var(--foreground)" }}>Contact support</button></div></Sheet>}
      {panel === "terms" && <Sheet title="Terms of service" description="The plain-language prototype terms." onClose={() => setPanel(null)}><div className="space-y-4" style={{ color: "var(--muted-foreground)", fontSize: "13px", lineHeight: 1.6 }}><p>Use Golden Atlas only for content you own or have permission to store. Do not upload unlawful, harmful or infringing material.</p><p>You remain responsible for maintaining access to your account and reviewing your exports before relying on them as backups.</p><p>The hosted legal terms will replace this prototype summary before public release.</p></div></Sheet>}
      {panel === "about" && <Sheet title="About Golden Atlas" description="Your private world of travel memories." onClose={() => setPanel(null)}><div className="text-center"><span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: "var(--gold)", color: "#1A1814" }}><Globe2 size={26} /></span><p style={{ color: "var(--foreground)", fontSize: "16px", fontWeight: 700 }}>Golden Atlas</p><p className="mt-1" style={{ color: "var(--muted-foreground)", fontSize: "12px" }}>Prototype version 0.1.0</p><div className="mt-5 rounded-2xl border p-4 text-left" style={{ borderColor: "var(--border)", color: "var(--muted-foreground)", fontSize: "12px", lineHeight: 1.5 }}><p>Country reference data: GeoNames, CC BY 4.0.</p><p className="mt-2">World map: @svg-maps/world, CC BY 4.0.</p></div></div></Sheet>}
      {panel === "delete-account" && <Sheet title="Delete account?" description="Review this carefully before continuing." onClose={() => setPanel(null)}><DeleteAccountForm remote={remote} onDelete={async (password) => { await deleteAccount(remote ? password : undefined); ["golden-atlas:theme", "golden-atlas:slideshow", "golden-atlas:image-quality", "golden-atlas:remove-location", "golden-atlas:analytics", "golden-atlas:reduced-motion"].forEach((key) => localStorage.removeItem(key)); navigate("/", { replace: true }); }} onCancel={() => setPanel(null)} /></Sheet>}
    </div>
  );
}
