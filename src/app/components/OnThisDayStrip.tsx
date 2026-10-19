import { Play } from "lucide-react";
import { useNavigate } from "react-router";
import type { OnThisDayEntry } from "../lib/trip-memories";

/** Memories from earlier years that happened on today's date. */
export function OnThisDayStrip({ entries }: { entries: OnThisDayEntry[] }) {
  const navigate = useNavigate();
  if (!entries.length) return null;
  const hasPhotos = entries.some((entry) => entry.photos.length > 0);
  return (
    <section className="px-4 pt-4" aria-label="On this day">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-xs font-bold uppercase tracking-[.14em]" style={{ color: "var(--muted-foreground)" }}>On this day</h2>
        {hasPhotos && (
          <button type="button" onClick={() => navigate("/app/slideshow?scope=onThisDay")} className="flex h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold" style={{ background: "var(--gold-light)", color: "var(--gold)" }}>
            <Play size={13} fill="currentColor" /> Play all
          </button>
        )}
      </div>
      <ul className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
        {entries.map((entry) => {
          const cover = entry.photos[0];
          const label = entry.day?.title || entry.trip.title;
          return (
            <li key={`${entry.trip.id}-${entry.date}`} className="flex-shrink-0">
              <button
                type="button"
                onClick={() => navigate(entry.photos.length ? `/app/slideshow?scope=day&id=${entry.trip.id}&date=${entry.date}` : `/app/trip/${entry.trip.id}`)}
                className="relative block h-36 w-28 overflow-hidden rounded-2xl text-left text-white"
                style={{ background: "linear-gradient(135deg, #5b4a1e, #1a1814)" }}
                aria-label={`${entry.year}: ${label}${entry.photos.length ? `, ${entry.photos.length} ${entry.photos.length === 1 ? "photo" : "photos"}` : ""}`}
              >
                {cover && <img src={cover.thumbnailUrl || cover.url} alt="" className="absolute inset-0 h-full w-full object-cover" />}
                <span className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
                <span className="absolute bottom-2 left-2.5 right-2.5">
                  <span className="block text-lg font-bold leading-none">{entry.year}</span>
                  <span className="mt-1 block truncate text-xs text-white/80">{label}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
