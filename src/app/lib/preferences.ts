export type SlideshowTransition = "Fade" | "Dissolve" | "None";
export type SlideshowOrder = "Chronological" | "Newest first" | "Shuffle";
export type ImageQuality = "Original" | "High" | "Optimised";

export interface SlideshowPreferences {
  duration: number;
  transition: SlideshowTransition;
  order: SlideshowOrder;
}

const SLIDESHOW_KEY = "golden-atlas:slideshow";
const IMAGE_QUALITY_KEY = "golden-atlas:image-quality";

export const DEFAULT_SLIDESHOW_PREFERENCES: SlideshowPreferences = {
  duration: 5,
  transition: "Fade",
  order: "Chronological",
};

export function getSlideshowPreferences(): SlideshowPreferences {
  try {
    return {
      ...DEFAULT_SLIDESHOW_PREFERENCES,
      ...JSON.parse(localStorage.getItem(SLIDESHOW_KEY) ?? "{}"),
    };
  } catch {
    return DEFAULT_SLIDESHOW_PREFERENCES;
  }
}

export function saveSlideshowPreferences(preferences: SlideshowPreferences) {
  localStorage.setItem(SLIDESHOW_KEY, JSON.stringify(preferences));
  window.dispatchEvent(new CustomEvent("golden-atlas:slideshow-change", { detail: preferences }));
}

export function getImageQuality(): ImageQuality {
  const value = localStorage.getItem(IMAGE_QUALITY_KEY);
  return value === "Original" || value === "Optimised" || value === "High" ? value : "High";
}

export function saveImageQuality(value: ImageQuality) {
  localStorage.setItem(IMAGE_QUALITY_KEY, value);
}

export function markOnboardingComplete() {
  localStorage.setItem("golden-atlas:onboarding-complete", "true");
}

export function hasCompletedOnboarding() {
  return localStorage.getItem("golden-atlas:onboarding-complete") === "true";
}
