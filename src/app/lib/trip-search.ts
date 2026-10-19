// Search across everything written on a trip: names, places, companions, journal, day diaries, and photo captions.
import { normalizeSearch } from "../data/countries";
import type { Trip } from "../types/domain";

export type MatchField = "title" | "place" | "companion" | "journal" | "day" | "caption";

export interface SearchMatch {
  field: MatchField;
  /** Where it matched, for example "Day 2 diary". */
  label: string;
  snippet: string;
  date?: string;
}

export interface TripSearchResult {
  trip: Trip;
  score: number;
  matches: SearchMatch[];
}

interface Entry { field: MatchField; label: string; text: string; date?: string }

/** Lowercases and strips accents, remembering where each kept character came from so snippets can use the original text. */
function normalizeWithMap(text: string) {
  let norm = "";
  const map: number[] = [];
  let offset = 0;
  for (const char of text) {
    const part = normalizeSearch(char);
    for (let index = 0; index < part.length; index += 1) map.push(offset);
    norm += part;
    offset += char.length;
  }
  return { norm, map };
}

const WINDOW = 48;

export function makeSnippet(text: string, token: string): string | null {
  const { norm, map } = normalizeWithMap(text);
  const at = norm.indexOf(token);
  if (at < 0) return null;
  const from = Math.max(0, (map[at] ?? 0) - WINDOW);
  const to = Math.min(text.length, (map[at + token.length - 1] ?? text.length) + 1 + WINDOW);
  const body = text.slice(from, to).replace(/\s+/g, " ").trim();
  return `${from > 0 ? "…" : ""}${body}${to < text.length ? "…" : ""}`;
}

function entriesFor(trip: Trip): Entry[] {
  const entries: Entry[] = [
    { field: "title", label: "name", text: trip.title },
    { field: "title", label: "country", text: trip.country },
    { field: "title", label: "city", text: trip.city },
    ...trip.places.map((text) => ({ field: "place" as const, label: "places", text })),
    ...trip.companions.map((text) => ({ field: "companion" as const, label: "companions", text })),
    { field: "journal", label: "journal", text: trip.journal },
  ];
  if (trip.favouriteMemory) entries.push({ field: "journal", label: "favourite memory", text: trip.favouriteMemory });
  (trip.days ?? []).forEach((day) => {
    const when = new Date(`${day.date}T00:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "short" });
    if (day.title) entries.push({ field: "day", label: `${when} title`, text: day.title, date: day.date });
    if (day.notes) entries.push({ field: "day", label: `${when} diary`, text: day.notes, date: day.date });
    (day.places ?? []).forEach((text) => entries.push({ field: "place", label: `${when} places`, text, date: day.date }));
  });
  trip.photos.forEach((photo) => {
    if (photo.caption) entries.push({ field: "caption", label: "a photo caption", text: photo.caption, date: photo.date });
    if (photo.location) entries.push({ field: "caption", label: "a photo location", text: photo.location, date: photo.date });
  });
  return entries.filter((entry) => entry.text.trim());
}

/**
 * Every word you type must appear somewhere on the trip (any order), so "kyoto temple" finds a trip with Kyoto
 * in the places and "temple" in a diary. Name matches rank first.
 */
export function searchTrips(trips: readonly Trip[], query: string): TripSearchResult[] {
  const tokens = normalizeSearch(query).split(/\s+/).filter(Boolean);
  if (!tokens.length) return trips.map((trip) => ({ trip, score: 0, matches: [] }));

  const results: TripSearchResult[] = [];
  for (const trip of trips) {
    const entries = entriesFor(trip).map((entry) => ({ entry, norm: normalizeSearch(entry.text) }));
    if (!tokens.every((token) => entries.some(({ norm }) => norm.includes(token)))) continue;

    const matches: SearchMatch[] = [];
    let score = 0;
    for (const { entry, norm } of entries) {
      const hit = tokens.find((token) => norm.includes(token));
      if (!hit) continue;
      if (entry.field === "title") score += 30;
      else score += 5;
      if (entry.field === "title" && tokens.every((token) => norm.includes(token))) score += 100;
      // Name, country and city matches are visible on the card already; show snippets only where text is hidden.
      if (entry.field === "title") continue;
      const snippet = makeSnippet(entry.text, hit);
      if (snippet) matches.push({ field: entry.field, label: entry.label, snippet, date: entry.date });
    }
    results.push({ trip, score, matches });
  }
  return results.sort((a, b) => b.score - a.score || b.trip.startDate.localeCompare(a.trip.startDate));
}
