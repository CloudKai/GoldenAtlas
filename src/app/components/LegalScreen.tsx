import { ArrowLeft, LockKeyhole } from "lucide-react";
import { useNavigate, useParams } from "react-router";

const DOCUMENTS = {
  privacy: {
    title: "Privacy Policy",
    intro: "Golden Atlas is designed as a private, local-first travel diary.",
    sections: [
      ["What this prototype stores", "Accounts, profile details, trips, city stops, journals, favourites, bucket-list choices and processed photos are stored in IndexedDB on this device. Display preferences are stored in localStorage and the active session is stored in sessionStorage."],
      ["Photos and location", "JPEG and PNG uploads are re-encoded in your browser before storage, which removes embedded EXIF and GPS metadata. City coordinates you intentionally add to a trip remain part of that trip."],
      ["Sharing and analytics", "This prototype has no public profile, social feed, advertising tracker or remote analytics service. Data stays in this browser unless you export it."],
      ["Your control", "You can export your account metadata, clear temporary browser caches, sign out, or permanently delete the local account and its stored photos from Profile."],
    ],
  },
  terms: {
    title: "Terms of Use",
    intro: "These terms describe the limitations of the Golden Atlas local prototype.",
    sections: [
      ["Prototype service", "Golden Atlas is provided for design evaluation and local testing. It is not yet a hosted backup or production authentication service."],
      ["Your content", "You retain responsibility for the photos and writing you add. Only add content you are permitted to store and export."],
      ["Availability", "Browser storage can be cleared by device settings, private browsing policies, or manual site-data removal. Keep exports of anything important."],
      ["Provider features", "Google and Apple authentication are intentionally unavailable until provider configuration and hosted security controls are completed."],
    ],
  },
} as const;

export function LegalScreen() {
  const navigate = useNavigate();
  const { document = "privacy" } = useParams();
  const content = DOCUMENTS[document as keyof typeof DOCUMENTS] ?? DOCUMENTS.privacy;
  return <div className="flex h-full flex-col bg-background">
    <header className="flex items-center gap-3 border-b px-4 py-3" style={{ borderColor: "var(--border)" }}><button onClick={() => navigate(-1)} className="flex h-11 w-11 items-center justify-center rounded-full" aria-label="Back" style={{ background: "var(--muted)" }}><ArrowLeft size={20}/></button><div><p className="text-[10px] font-bold uppercase tracking-[.16em]" style={{ color: "var(--gold)" }}>Golden Atlas</p><h1 className="text-xl font-semibold">{content.title}</h1></div></header>
    <main className="flex-1 overflow-y-auto px-6 py-6"><div className="mb-6 flex items-start gap-3 rounded-2xl p-4" style={{ background: "var(--gold-light)" }}><LockKeyhole size={20} color="var(--gold)"/><p className="text-sm leading-6" style={{ color: "var(--muted-foreground)" }}>{content.intro}</p></div>{content.sections.map(([heading, body]) => <section key={heading} className="mb-6"><h2 className="mb-2 text-base font-semibold">{heading}</h2><p className="text-sm leading-6" style={{ color: "var(--muted-foreground)" }}>{body}</p></section>)}<p className="pb-6 text-xs" style={{ color: "var(--muted-foreground)" }}>Prototype policy · Updated July 20, 2026</p></main>
  </div>;
}
