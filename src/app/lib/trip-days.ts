// Pure helpers for planning trips ahead and organising a trip into day folders.
// Types only: this module must stay free of runtime imports so it can be unit tested in Node.
import type { MemoryPhoto, Trip, TripDay } from "../types/domain";

/** Longest range rendered as day folders; protects the UI from a mistyped year. */
export const MAX_RENDERED_DAYS = 366;

const DAY_MS = 86_400_000;
const parse = (date: string) => Date.parse(`${date}T00:00:00Z`);
const isDate = (value: string | undefined): value is string => Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(parse(value)));

/** Today's date in the user's own time zone, as YYYY-MM-DD. */
export function todayISO(now = new Date()) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function addDays(date: string, amount: number) {
  return new Date(parse(date) + amount * DAY_MS).toISOString().slice(0, 10);
}

export const daysBetween = (from: string, to: string) => Math.round((parse(to) - parse(from)) / DAY_MS);

/** Every calendar date from start to end inclusive. */
export function datesInRange(startDate: string, endDate: string, limit = MAX_RENDERED_DAYS) {
  if (!isDate(startDate) || !isDate(endDate) || endDate < startDate) return [];
  const count = Math.min(limit, daysBetween(startDate, endDate) + 1);
  return Array.from({ length: count }, (_, index) => addDays(startDate, index));
}

export type TripStatus = "upcoming" | "ongoing" | "past";

export function tripStatus(trip: Pick<Trip, "startDate" | "endDate">, today = todayISO()): TripStatus {
  if (trip.startDate > today) return "upcoming";
  return trip.endDate >= today ? "ongoing" : "past";
}

/** Only trips that have started turn a country gold and count toward statistics; planned trips stay under "Upcoming". */
export const hasStarted = (trip: Pick<Trip, "startDate">, today = todayISO()) => trip.startDate <= today;

export function daysUntil(trip: Pick<Trip, "startDate">, today = todayISO()) {
  return Math.max(0, daysBetween(today, trip.startDate));
}

// ---------------------------------------------------------------------------
// Day folders
// ---------------------------------------------------------------------------

export const tripDays = (trip: Pick<Trip, "days">): TripDay[] => trip.days ?? [];
export const dayHasContent = (day: Pick<TripDay, "title" | "notes" | "places">) => Boolean(day.title?.trim() || day.notes.trim() || day.places?.length);

export interface DayFolder {
  date: string;
  /** 1-based position within the trip. */
  number: number;
  title: string;
  notes: string;
  places: string[];
  photos: MemoryPhoto[];
}

export interface DayFolders {
  days: DayFolder[];
  /** Photos dated outside the trip. They are kept, never hidden. */
  otherPhotos: MemoryPhoto[];
  /** True when the trip is longer than what is rendered as folders. */
  truncated: boolean;
}

export function dayFolders(trip: Pick<Trip, "startDate" | "endDate" | "photos" | "days">): DayFolders {
  const dates = datesInRange(trip.startDate, trip.endDate);
  const byDate = new Map(tripDays(trip).map((day) => [day.date, day]));
  const inRange = new Set(dates);
  const photosByDate = new Map<string, MemoryPhoto[]>();
  const otherPhotos: MemoryPhoto[] = [];
  trip.photos.forEach((photo) => {
    if (inRange.has(photo.date)) photosByDate.set(photo.date, [...(photosByDate.get(photo.date) ?? []), photo]);
    else otherPhotos.push(photo);
  });
  return {
    days: dates.map((date, index) => ({
      date,
      number: index + 1,
      title: byDate.get(date)?.title ?? "",
      notes: byDate.get(date)?.notes ?? "",
      places: byDate.get(date)?.places ?? [],
      photos: photosByDate.get(date) ?? [],
    })),
    otherPhotos,
    truncated: isDate(trip.startDate) && isDate(trip.endDate) && daysBetween(trip.startDate, trip.endDate) + 1 > MAX_RENDERED_DAYS,
  };
}

/** Sets a day's title and diary. A day with nothing written is removed, since empty days exist implicitly. */
export function updateDay(trip: Trip, date: string, patch: Partial<Pick<TripDay, "title" | "notes" | "places">>): Trip {
  const current = tripDays(trip).find((day) => day.date === date) ?? { date, title: undefined, notes: "" };
  const next: TripDay = { ...current, ...patch };
  const others = tripDays(trip).filter((day) => day.date !== date);
  return { ...trip, days: dayHasContent(next) ? [...others, next].sort((a, b) => a.date.localeCompare(b.date)) : others };
}

const durationOf = (startDate: string, endDate: string) => Math.max(1, daysBetween(startDate, endDate) + 1);

/** Adds one more day to the end of a trip. */
export function addDayToTrip(trip: Trip): Trip {
  const endDate = addDays(trip.endDate, 1);
  return { ...trip, endDate, duration: durationOf(trip.startDate, endDate) };
}

export function canRemoveLastDay(trip: Trip) {
  if (daysBetween(trip.startDate, trip.endDate) < 1) return false;
  const last = trip.endDate;
  return !trip.photos.some((photo) => photo.date === last) && !tripDays(trip).some((day) => day.date === last && dayHasContent(day));
}

/** Removes the last day only when nothing has been saved on it. */
export function removeLastDay(trip: Trip): Trip {
  if (!canRemoveLastDay(trip)) return trip;
  const endDate = addDays(trip.endDate, -1);
  return { ...trip, endDate, duration: durationOf(trip.startDate, endDate) };
}

/** Moves a photo into another day folder. */
export function movePhotoToDay(trip: Trip, photoId: string, date: string): Trip {
  return { ...trip, photos: trip.photos.map((photo) => photo.id === photoId ? { ...photo, date } : photo) };
}

export function updatePhoto(trip: Trip, photoId: string, patch: Partial<Pick<MemoryPhoto, "caption" | "location">>): Trip {
  return { ...trip, photos: trip.photos.map((photo) => photo.id === photoId ? { ...photo, ...patch } : photo) };
}

/** Days with writing on them that would fall outside the trip's dates; saving would silently lose them. */
export function strandedDays(trip: Pick<Trip, "startDate" | "endDate" | "days">) {
  if (!isDate(trip.startDate) || !isDate(trip.endDate)) return [];
  return tripDays(trip).filter((day) => dayHasContent(day) && (day.date < trip.startDate || day.date > trip.endDate)).map((day) => day.date);
}

/** Keeps photos inside the trip: a photo with no meaningful date (for example a new upload) lands on the first day. */
export function placePhotosInTrip(photos: readonly MemoryPhoto[], startDate: string, endDate: string): MemoryPhoto[] {
  return photos.map((photo) => photo.date >= startDate && photo.date <= endDate ? photo : { ...photo, date: startDate });
}

export interface DayPlan {
  toUpsert: TripDay[];
  toDelete: string[];
}

/** Which day rows to write and which to remove when a trip is saved. */
export function planDaySync(existing: readonly TripDay[], next: readonly TripDay[]): DayPlan {
  const keep = next.filter(dayHasContent);
  const kept = new Set(keep.map((day) => day.date));
  return {
    toUpsert: keep.filter((day) => {
      const before = existing.find((item) => item.date === day.date);
      return !before || (before.title ?? "") !== (day.title ?? "") || before.notes !== day.notes || (before.places ?? []).join("\n") !== (day.places ?? []).join("\n");
    }),
    toDelete: existing.filter((day) => !kept.has(day.date)).map((day) => day.date),
  };
}

// ---------------------------------------------------------------------------
// Places visited each day
// ---------------------------------------------------------------------------

export const MAX_DAY_PLACES = 30;
const cleanPlace = (name: string) => name.trim().replace(/\s+/g, " ").slice(0, 180);
const samePlace = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

/** Adds or removes a place from one day, keeping the order the places were visited. */
export function toggleDayPlace(trip: Trip, date: string, name: string): Trip {
  const typed = cleanPlace(name);
  if (!typed) return trip;
  // Use the trip's own spelling of a place so "gion" and "Gion" are one place.
  const place = trip.places.find((existing) => samePlace(existing, typed)) ?? typed;
  const current = tripDays(trip).find((day) => day.date === date)?.places ?? [];
  const has = current.some((existing) => samePlace(existing, place));
  if (!has && current.length >= MAX_DAY_PLACES) return trip;
  return updateDay(trip, date, { places: has ? current.filter((existing) => !samePlace(existing, place)) : [...current, place] });
}

/** Adds a brand-new place to the trip's places and to the chosen day. */
export function addPlaceToDay(trip: Trip, date: string, name: string): Trip {
  const place = cleanPlace(name);
  if (!place) return trip;
  const known = trip.places.find((existing) => samePlace(existing, place));
  const withPlace = known ? trip : { ...trip, places: [...trip.places, place] };
  const alreadyThere = (tripDays(withPlace).find((day) => day.date === date)?.places ?? []).some((existing) => samePlace(existing, place));
  return alreadyThere ? withPlace : toggleDayPlace(withPlace, date, known ?? place);
}

/** "Tokyo → Kyoto → Osaka" */
export const routeLabel = (places: readonly string[]) => places.join(" → ");
