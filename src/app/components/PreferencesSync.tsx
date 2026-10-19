import { useEffect, useRef } from "react";
import { useAppData } from "../contexts/AppDataContext";
import { useTheme } from "../contexts/ThemeContext";
import { LOCAL_KEYS, PREFERENCES_EVENT, readLocalPreferences, writeLocalPreferences, type AccountPreferences, type PreferencesPatch } from "../lib/preferences-sync";

const mergePatch = (a: PreferencesPatch, b: PreferencesPatch): PreferencesPatch => ({ ...a, ...b, slideshow: { ...a.slideshow, ...b.slideshow } });

/**
 * Keeps this device's settings and the account's in step. Signing in on a new device brings your settings with you;
 * changing a setting saves it to the account a moment later. It renders nothing.
 */
export function PreferencesSync() {
  const { user, remote, accountPreferences, savePreferences } = useAppData();
  const { setTheme } = useTheme();
  const applied = useRef<string | null>(null);
  const applying = useRef(false);
  const save = useRef(savePreferences);
  save.current = savePreferences;
  const pending = useRef<PreferencesPatch>({});
  const timer = useRef<number | undefined>(undefined);
  const userId = user?.id;

  // Reduced motion applies from the first screen, not only after Settings has been opened.
  useEffect(() => {
    document.documentElement.classList.toggle("reduce-motion", localStorage.getItem(LOCAL_KEYS.reducedMotion) === "true");
  }, []);

  // On sign-in: the account's settings win, unless it has never been customised, in which case this device's settings are uploaded.
  useEffect(() => {
    if (!userId) { applied.current = null; return; }
    if (!remote || !accountPreferences || applied.current === userId) return;
    applied.current = userId;
    applying.current = true;
    try {
      if (accountPreferences.untouched) {
        void save.current(readLocalPreferences(localStorage)).catch(() => undefined);
      } else {
        const values = accountPreferences.values;
        writeLocalPreferences(values, localStorage);
        document.documentElement.classList.toggle("reduce-motion", values.reducedMotion);
        setTheme(values.theme);
      }
    } finally { applying.current = false; }
  }, [userId, remote, accountPreferences, setTheme]);

  // Later changes are saved after a short pause so dragging through options does not send a request per tap.
  useEffect(() => {
    if (!remote || !userId) return;
    const flush = () => {
      const patch = pending.current;
      pending.current = {};
      if (Object.keys(patch).length) void save.current(patch).catch(() => undefined);
    };
    const queue = (patch: PreferencesPatch) => {
      if (applying.current) return;
      pending.current = mergePatch(pending.current, patch);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(flush, 800);
    };
    const onPreference = (event: Event) => queue((event as CustomEvent<PreferencesPatch>).detail);
    const onSlideshow = (event: Event) => queue({ slideshow: (event as CustomEvent<AccountPreferences["slideshow"]>).detail });
    window.addEventListener(PREFERENCES_EVENT, onPreference);
    window.addEventListener("golden-atlas:slideshow-change", onSlideshow);
    return () => {
      window.removeEventListener(PREFERENCES_EVENT, onPreference);
      window.removeEventListener("golden-atlas:slideshow-change", onSlideshow);
      window.clearTimeout(timer.current);
      pending.current = {};
    };
  }, [remote, userId]);

  return null;
}
