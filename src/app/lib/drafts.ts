// Unsaved work is kept on this device so a dropped connection, a closed tab, or a crash does not lose a diary entry.
// Drafts hold text only: photos are large and are asked for again.
import type { Trip, TripDay, TripExpense } from "../types/domain";

export type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export interface DraftEnvelope<T> {
  version: 1;
  savedAt: string;
  data: T;
}

const PREFIX = "golden-atlas:draft:";
const MAX_CHARS = 250_000;
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

const browserStorage = (): StorageLike | null => {
  try { return typeof localStorage === "undefined" ? null : localStorage; } catch { return null; }
};

/** Returns false when the draft could not be kept (storage full, blocked, or too large). */
export function saveDraft<T>(key: string, data: T, storage: StorageLike | null = browserStorage(), now = new Date()): boolean {
  if (!storage) return false;
  try {
    const text = JSON.stringify({ version: 1, savedAt: now.toISOString(), data } satisfies DraftEnvelope<T>);
    if (text.length > MAX_CHARS) return false;
    storage.setItem(PREFIX + key, text);
    return true;
  } catch { return false; }
}

export function loadDraft<T>(key: string, storage: StorageLike | null = browserStorage(), now = new Date()): DraftEnvelope<T> | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<DraftEnvelope<T>>;
    const age = now.getTime() - Date.parse(parsed.savedAt ?? "");
    if (parsed.version !== 1 || parsed.data === undefined || !Number.isFinite(age) || age > MAX_AGE_MS) {
      storage.removeItem(PREFIX + key);
      return null;
    }
    return parsed as DraftEnvelope<T>;
  } catch {
    try { storage.removeItem(PREFIX + key); } catch { /* nothing more to do */ }
    return null;
  }
}

export function clearDraft(key: string, storage: StorageLike | null = browserStorage()) {
  try { storage?.removeItem(PREFIX + key); } catch { /* ignore */ }
}

/** Removes every draft on this device. Used on sign-out so private writing does not stay behind on a shared computer. */
export function clearAllDrafts(storage: (StorageLike & Partial<Pick<Storage, "key" | "length">>) | null = browserStorage()) {
  try {
    if (!storage || typeof storage.key !== "function" || typeof storage.length !== "number") return;
    const keys: string[] = [];
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (key?.startsWith(PREFIX)) keys.push(key);
    }
    keys.forEach((key) => storage.removeItem(key));
  } catch { /* nothing more can be done */ }
}

// ---------------------------------------------------------------------------
// Draft of a new trip
// ---------------------------------------------------------------------------

export interface NewTripDraft {
  countryId: string;
  title: string;
  startDate: string;
  endDate: string;
  journal: string;
  mood: string;
  rating: number;
  selectedCityIds: string[];
  customPlaces: string[];
  companions: string[];
  expense?: TripExpense;
}

/** True when there is something worth offering to restore. */
export const newTripDraftHasContent = (draft: NewTripDraft) =>
  Boolean(draft.title.trim() || draft.startDate || draft.endDate || draft.journal.trim() || draft.selectedCityIds.length || draft.customPlaces.length || draft.companions.length || draft.expense);

// ---------------------------------------------------------------------------
// Draft of edits to an existing trip
// ---------------------------------------------------------------------------

export interface TripEditDraft {
  title: string;
  startDate: string;
  endDate: string;
  journal: string;
  mood: string;
  rating: number;
  companions: string[];
  expense?: TripExpense;
  places: string[];
  days: TripDay[];
  /** Captions keyed by photo id; photos themselves are not kept. */
  captions: Record<string, string>;
}

export function toEditDraft(trip: Trip): TripEditDraft {
  return {
    title: trip.title, startDate: trip.startDate, endDate: trip.endDate, journal: trip.journal, mood: trip.mood, rating: trip.rating,
    companions: trip.companions, expense: trip.expense, places: trip.places, days: trip.days ?? [],
    captions: Object.fromEntries(trip.photos.map((photo) => [photo.id, photo.caption])),
  };
}

export function applyEditDraft(trip: Trip, draft: TripEditDraft): Trip {
  return {
    ...trip,
    title: draft.title, startDate: draft.startDate, endDate: draft.endDate, journal: draft.journal, mood: draft.mood, rating: draft.rating,
    companions: draft.companions, expense: draft.expense, places: draft.places, days: draft.days,
    photos: trip.photos.map((photo) => draft.captions[photo.id] !== undefined ? { ...photo, caption: draft.captions[photo.id] } : photo),
  };
}

/** Whether editing has changed anything, so a draft is only written for real changes. */
export const editDraftDiffers = (trip: Trip, draft: TripEditDraft) => JSON.stringify(toEditDraft(trip)) !== JSON.stringify(draft);
