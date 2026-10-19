import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { ArrowLeft, Printer } from "lucide-react";
import { useAppData } from "../contexts/AppDataContext";
import { dayFolders, routeLabel, tripStatus } from "../lib/trip-days";
import { formatMoney } from "../lib/trip-extras";
import type { MemoryPhoto } from "../types/domain";

const fullDate = (date: string) => new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
const shortDate = (date: string) => new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

function Photos({ photos }: { photos: MemoryPhoto[] }) {
  if (!photos.length) return null;
  return (
    <div className="mt-4 grid grid-cols-2 gap-3">
      {photos.map((photo) => (
        <figure key={photo.id} className="keep-together">
          <img src={photo.url || photo.thumbnailUrl} alt={photo.caption} className="w-full rounded-lg object-cover" style={{ aspectRatio: "4 / 3" }} />
          {(photo.caption || photo.location) && (
            <figcaption className="mt-1 text-xs leading-snug text-neutral-600">
              {photo.caption}{photo.caption && photo.location ? " · " : ""}{photo.location}
            </figcaption>
          )}
        </figure>
      ))}
    </div>
  );
}

/**
 * A private, print-ready book of one trip. It is built in the browser from data you already own; use the browser's
 * print dialog to save it as a PDF. Nothing is uploaded or shared.
 */
export function TripBookScreen() {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const { state } = useAppData();
  const trip = state?.trips.find((item) => item.id === tripId);
  const folders = useMemo(() => (trip ? dayFolders(trip) : null), [trip]);
  const [preparing, setPreparing] = useState(false);

  if (!trip || !folders) {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-background px-6 text-center">
        <h1 className="text-lg font-semibold">Trip not found</h1>
        <button onClick={() => navigate("/app/trips")} className="mt-4 h-11 px-4" style={{ color: "var(--gold)" }}>Back to Trips</button>
      </div>
    );
  }

  const status = tripStatus(trip);
  const print = async () => {
    setPreparing(true);
    // Wait for the photos so none print as blanks.
    await Promise.all([...document.querySelectorAll<HTMLImageElement>(".trip-book img")].map((image) => image.decode().catch(() => undefined)));
    setPreparing(false);
    window.print();
  };

  return (
    <div className="trip-book h-full overflow-y-auto bg-white text-neutral-900">
      <div className="print-hidden sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-neutral-200 bg-white px-4 py-3">
        <button type="button" onClick={() => navigate(-1)} className="flex h-11 w-11 items-center justify-center rounded-full bg-neutral-100" aria-label="Back to trip"><ArrowLeft size={20} /></button>
        <button type="button" onClick={print} disabled={preparing} className="flex h-11 items-center gap-2 rounded-xl px-4 text-sm font-semibold disabled:opacity-60" style={{ background: "var(--gold)", color: "#1a1814" }}>
          <Printer size={16} /> {preparing ? "Preparing…" : "Print or save as PDF"}
        </button>
      </div>

      <article className="mx-auto max-w-[720px] px-6 pb-12 pt-8">
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">Golden Atlas · Trip book</p>
          <h1 className="mt-3 text-4xl font-semibold leading-tight tracking-tight">{trip.mood} {trip.title}</h1>
          <p className="mt-2 text-lg text-neutral-600">{trip.countryFlag} {trip.city !== trip.country ? `${trip.city}, ` : ""}{trip.country}</p>
          <p className="mt-1 text-sm text-neutral-500">
            {shortDate(trip.startDate)}{trip.endDate !== trip.startDate ? ` – ${shortDate(trip.endDate)}` : ""} · {trip.duration} {trip.duration === 1 ? "day" : "days"}
            {status === "upcoming" ? " · planned" : ""}
          </p>
          <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            {trip.companions.length > 0 && <><dt className="text-neutral-500">With</dt><dd>{trip.companions.join(", ")}</dd></>}
            {trip.expense && <><dt className="text-neutral-500">{status === "upcoming" ? "Budget" : "Spent"}</dt><dd>{formatMoney(trip.expense.amount, trip.expense.currency)}</dd></>}
            {trip.rating > 0 && <><dt className="text-neutral-500">Rating</dt><dd aria-label={`${trip.rating} out of 5`}>{"★".repeat(trip.rating)}{"☆".repeat(5 - trip.rating)}</dd></>}
          </dl>
          {trip.photos[0] && <img src={trip.photos[0].url || trip.photos[0].thumbnailUrl} alt={trip.photos[0].caption} className="mt-6 w-full rounded-xl object-cover" style={{ aspectRatio: "16 / 10" }} />}
        </header>

        {trip.journal.trim() && (
          <section className="mt-8">
            <h2 className="text-xl font-semibold">Journal</h2>
            <p className="mt-2 whitespace-pre-wrap text-[15px] leading-7">{trip.journal}</p>
          </section>
        )}

        {trip.favouriteMemory?.trim() && (
          <section className="keep-together mt-6 rounded-xl bg-neutral-50 p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">Favourite memory</h2>
            <p className="mt-1 whitespace-pre-wrap text-[15px] leading-7">{trip.favouriteMemory}</p>
          </section>
        )}

        {folders.days.map((day) => (
          <section key={day.date} className="mt-10">
            <h2 className="text-xl font-semibold">Day {day.number}{day.title ? ` · ${day.title}` : ""}</h2>
            <p className="text-sm text-neutral-500">{fullDate(day.date)}</p>
            {day.places.length > 0 && <p className="mt-2 text-sm font-medium">{routeLabel(day.places)}</p>}
            {day.notes.trim()
              ? <p className="mt-3 whitespace-pre-wrap text-[15px] leading-7">{day.notes}</p>
              : day.photos.length === 0 && <p className="mt-3 text-sm italic text-neutral-400">Nothing recorded for this day.</p>}
            <Photos photos={day.photos} />
          </section>
        ))}

        {folders.otherPhotos.length > 0 && (
          <section className="mt-10">
            <h2 className="text-xl font-semibold">Other photos</h2>
            <Photos photos={folders.otherPhotos} />
          </section>
        )}

        <footer className="mt-12 border-t border-neutral-200 pt-4 text-xs text-neutral-400">Made privately with Golden Atlas. Not shared with anyone.</footer>
      </article>
    </div>
  );
}
