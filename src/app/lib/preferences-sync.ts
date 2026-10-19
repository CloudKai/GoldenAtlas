// Maps the web app's per-device settings to the account's `user_preferences` row so they follow the user.
import type { Tables, TablesUpdate } from "../../types/database.generated";
import { DEFAULT_SLIDESHOW_PREFERENCES, type SlideshowOrder, type SlideshowTransition } from "./preferences";
import type { StorageLike } from "./drafts";

export type ThemeChoice = "system" | "light" | "dark";

export interface AccountPreferences {
  theme: ThemeChoice;
  reducedMotion: boolean;
  /** Strip exact photo location by default. Private by default, so this is on unless switched off. */
  removeLocation: boolean;
  analytics: boolean;
  slideshow: { duration: number; transition: SlideshowTransition; order: SlideshowOrder };
}

export type PreferencesPatch = Partial<Omit<AccountPreferences, "slideshow">> & { slideshow?: Partial<AccountPreferences["slideshow"]> };
export type PreferenceRow = Tables<"user_preferences">;

export const PREFERENCES_EVENT = "golden-atlas:preferences-change";
export const emitPreferenceChange = (patch: PreferencesPatch) => window.dispatchEvent(new CustomEvent<PreferencesPatch>(PREFERENCES_EVENT, { detail: patch }));

export const LOCAL_KEYS = {
  theme: "golden-atlas:theme",
  reducedMotion: "golden-atlas:reduced-motion",
  removeLocation: "golden-atlas:remove-location",
  analytics: "golden-atlas:analytics",
  slideshow: "golden-atlas:slideshow",
} as const;

const ORDER_TO_DB: Record<SlideshowOrder, string> = { Chronological: "chronological", "Newest first": "reverse_chronological", Shuffle: "random" };
const ORDER_FROM_DB: Record<string, SlideshowOrder> = { chronological: "Chronological", reverse_chronological: "Newest first", random: "Shuffle" };
const TRANSITION_TO_DB: Record<SlideshowTransition, string> = { Fade: "fade", Dissolve: "dissolve", None: "none" };
// The native app also offers a slide; the web has no slide, so it shows the closest transition it has.
const TRANSITION_FROM_DB: Record<string, SlideshowTransition> = { fade: "Fade", slide: "Fade", dissolve: "Dissolve", none: "None" };

const clampDuration = (seconds: number) => Math.min(30, Math.max(2, Math.round(seconds)));

export function preferencesFromRow(row: Pick<PreferenceRow, "theme" | "reduced_motion" | "remove_photo_gps_by_default" | "analytics_consent" | "slideshow_duration_seconds" | "slideshow_transition" | "slideshow_order">): AccountPreferences {
  return {
    theme: row.theme === "light" || row.theme === "dark" ? row.theme : "system",
    reducedMotion: row.reduced_motion,
    removeLocation: row.remove_photo_gps_by_default,
    analytics: row.analytics_consent,
    slideshow: {
      duration: clampDuration(row.slideshow_duration_seconds),
      transition: TRANSITION_FROM_DB[row.slideshow_transition] ?? DEFAULT_SLIDESHOW_PREFERENCES.transition,
      order: ORDER_FROM_DB[row.slideshow_order] ?? DEFAULT_SLIDESHOW_PREFERENCES.order,
    },
  };
}

export function rowPatchFromPreferences(patch: PreferencesPatch): TablesUpdate<"user_preferences"> {
  const row: TablesUpdate<"user_preferences"> = {};
  if (patch.theme !== undefined) row.theme = patch.theme;
  if (patch.reducedMotion !== undefined) row.reduced_motion = patch.reducedMotion;
  if (patch.removeLocation !== undefined) row.remove_photo_gps_by_default = patch.removeLocation;
  if (patch.analytics !== undefined) row.analytics_consent = patch.analytics;
  if (patch.slideshow?.duration !== undefined) row.slideshow_duration_seconds = clampDuration(patch.slideshow.duration);
  if (patch.slideshow?.transition !== undefined) row.slideshow_transition = TRANSITION_TO_DB[patch.slideshow.transition];
  if (patch.slideshow?.order !== undefined) row.slideshow_order = ORDER_TO_DB[patch.slideshow.order];
  return row;
}

/** A row that has never been edited still holds the defaults, so this device's settings should win instead. */
export const isUntouchedRow = (row: Pick<PreferenceRow, "created_at" | "updated_at">) =>
  Math.abs(Date.parse(row.updated_at) - Date.parse(row.created_at)) < 2000;

/** Merges a patch into a full set of preferences. */
export function mergePreferences(base: AccountPreferences, patch: PreferencesPatch): AccountPreferences {
  return { ...base, ...patch, slideshow: { ...base.slideshow, ...patch.slideshow } } as AccountPreferences;
}

export function readLocalPreferences(storage: StorageLike): AccountPreferences {
  const get = (key: string) => { try { return storage.getItem(key); } catch { return null; } };
  const theme = get(LOCAL_KEYS.theme);
  let slideshow = { ...DEFAULT_SLIDESHOW_PREFERENCES } as AccountPreferences["slideshow"];
  try { slideshow = { ...slideshow, ...JSON.parse(get(LOCAL_KEYS.slideshow) ?? "{}") }; } catch { /* keep defaults */ }
  return {
    theme: theme === "light" || theme === "dark" ? theme : "system",
    reducedMotion: get(LOCAL_KEYS.reducedMotion) === "true",
    removeLocation: get(LOCAL_KEYS.removeLocation) !== "false",
    analytics: get(LOCAL_KEYS.analytics) === "true",
    slideshow,
  };
}

export function writeLocalPreferences(preferences: AccountPreferences, storage: StorageLike) {
  try {
    storage.setItem(LOCAL_KEYS.theme, preferences.theme);
    storage.setItem(LOCAL_KEYS.reducedMotion, String(preferences.reducedMotion));
    storage.setItem(LOCAL_KEYS.removeLocation, String(preferences.removeLocation));
    storage.setItem(LOCAL_KEYS.analytics, String(preferences.analytics));
    storage.setItem(LOCAL_KEYS.slideshow, JSON.stringify(preferences.slideshow));
  } catch { /* the settings still apply for this session */ }
}
