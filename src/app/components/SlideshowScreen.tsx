import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Play, Pause, X, Settings, Heart, SkipBack, SkipForward } from "lucide-react";
import { motion } from "motion/react";
import { getSlideshowPreferences, saveSlideshowPreferences, type SlideshowTransition } from "../lib/preferences";
import { useAppData } from "../contexts/AppDataContext";
import { photosForScope } from "../lib/selectors";
import type { SlideshowScope } from "../types/domain";

interface Slide {
  photo: { id: string; url: string; caption: string; date: string; location?: string; isFavourite: boolean };
  country: string;
  countryFlag: string;
  city: string;
  tripTitle: string;
  tripDate: string;
  mood: string;
}

export function SlideshowScreen() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { state, togglePhotoFavourite } = useAppData();
  const scope = useMemo<SlideshowScope>(() => {
    const type = searchParams.get("scope");
    const id = searchParams.get("id") ?? "";
    if (type === "trip") return { type: "trip", tripId: id };
    if (type === "country") return { type: "country", countryId: id };
    if (type === "favourites") return { type: "favourites" };
    if (type === "selection") return { type: "selection", photoIds: (searchParams.get("photoIds") ?? "").split(",").filter(Boolean) };
    return { type: "all" };
  }, [searchParams]);
  const [preferences, setPreferences] = useState(getSlideshowPreferences);
  const slides = useMemo(() => {
    if (!state) return [];
    const tripById = new Map(state.trips.map((trip) => [trip.id, trip]));
    const scopedSlides: Slide[] = photosForScope(state, scope).map((photo) => {
      const trip = tripById.get(photo.tripId)!;
      return { photo, country: trip.country, countryFlag: trip.countryFlag, city: trip.city, tripTitle: trip.title, tripDate: new Date(`${trip.startDate}T00:00:00`).getFullYear().toString(), mood: trip.mood };
    });
    if (preferences.order === "Newest first") {
      return [...scopedSlides].sort((a, b) => b.photo.date.localeCompare(a.photo.date));
    }
    if (preferences.order === "Shuffle") {
      return [...scopedSlides].sort((a, b) => a.photo.id.localeCompare(b.photo.id) || a.photo.date.localeCompare(b.photo.date));
    }
    return [...scopedSlides].sort((a, b) => a.photo.date.localeCompare(b.photo.date));
  }, [preferences.order, scope, state]);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [duration, setDuration] = useState(preferences.duration);
  const [progress, setProgress] = useState(0);
  const hideTimer = useRef<ReturnType<typeof setTimeout>>();
  const progressTimer = useRef<ReturnType<typeof setInterval>>();
  const touchStart = useRef<number | null>(null);
  const reduceMotion = localStorage.getItem("golden-atlas:reduced-motion") === "true" || window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const slide = slides[index];
  const totalSlides = slides.length;

  const resetHideTimer = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setShowControls(true);
    hideTimer.current = setTimeout(() => setShowControls(false), 4000);
  }, []);

  const goNext = useCallback(() => {
    setIndex((i) => (i + 1) % totalSlides);
    setProgress(0);
    resetHideTimer();
  }, [totalSlides, resetHideTimer]);

  const goPrev = useCallback(() => {
    setIndex((i) => (i - 1 + totalSlides) % totalSlides);
    setProgress(0);
    resetHideTimer();
  }, [totalSlides, resetHideTimer]);

  // Auto-advance
  useEffect(() => {
    if (progressTimer.current) clearInterval(progressTimer.current);
    if (!playing || showSettings || totalSlides < 2) return;

    const tick = 100;
    const steps = (duration * 1000) / tick;
    let step = 0;

    progressTimer.current = setInterval(() => {
      step++;
      setProgress((step / steps) * 100);
      if (step >= steps) {
        goNext();
        step = 0;
      }
    }, tick);

    return () => { if (progressTimer.current) clearInterval(progressTimer.current); };
  }, [playing, showSettings, duration, index, goNext, totalSlides]);

  const updateDuration = (nextDuration: number) => {
    setDuration(nextDuration);
    setProgress(0);
    const next = { ...preferences, duration: nextDuration };
    setPreferences(next);
    saveSlideshowPreferences(next);
  };

  const updateTransition = (transition: SlideshowTransition) => {
    const next = { ...preferences, transition };
    setPreferences(next);
    saveSlideshowPreferences(next);
  };

  // Hide controls timer
  useEffect(() => {
    resetHideTimer();
    return () => { if (hideTimer.current) clearTimeout(hideTimer.current); };
  }, []);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") goNext();
      if (event.key === "ArrowLeft") goPrev();
      if (event.key === " ") { event.preventDefault(); setPlaying((value) => !value); }
      if (event.key === "Escape") showSettings ? setShowSettings(false) : navigate(-1);
    };
    window.addEventListener("keydown", handler); return () => window.removeEventListener("keydown", handler);
  }, [goNext, goPrev, navigate, showSettings]);

  const handleTap = () => {
    resetHideTimer();
  };

  if (!slide) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-[#1A1814]">
        <p className="text-white">No photos to show.</p>
        <button onClick={() => navigate(-1)} className="mt-4 h-11 px-4 text-white/60">Back</button>
      </div>
    );
  }

  return (
    <div
      className="relative h-full bg-black overflow-hidden select-none"
      onClick={handleTap}
      onTouchStart={(event) => { touchStart.current = event.touches[0].clientX; }}
      onTouchEnd={(event) => { if (touchStart.current == null) return; const distance = event.changedTouches[0].clientX - touchStart.current; if (Math.abs(distance) > 45) distance < 0 ? goNext() : goPrev(); touchStart.current = null; }}
    >
      {/* Full-screen image */}
      <motion.img
        key={slide.photo.id}
        src={slide.photo.url}
        alt={slide.photo.caption}
        className="absolute inset-0 w-full h-full object-cover"
        initial={preferences.transition === "None" || reduceMotion ? false : { opacity: 0, scale: preferences.transition === "Dissolve" ? 1.015 : 1.03 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: preferences.transition === "None" || reduceMotion ? 0 : preferences.transition === "Dissolve" ? 1.25 : 0.75, ease: "easeOut" }}
        style={{ willChange: "transform, opacity" }}
      />

      {/* Gradient overlays */}
      <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, transparent 25%, transparent 55%, rgba(0,0,0,0.75) 100%)" }} />

      {/* Progress bar */}
      <div className="absolute top-0 left-0 right-0 z-20" style={{ paddingTop: "56px" }}>
        <div className="mx-4 h-0.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.25)" }}>
          <div
            className="h-full rounded-full transition-none"
            style={{ width: `${progress}%`, background: "var(--gold)" }}
          />
        </div>

        {/* Slide counter */}
        <div className="flex justify-center mt-1.5">
          <span className="text-white/50" style={{ fontSize: "11px" }}>
            {index + 1} / {totalSlides}
          </span>
        </div>
      </div>

      {/* Top controls */}
      {showControls && (
        <motion.div
          className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4"
          style={{ paddingTop: "88px" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            onClick={(e) => { e.stopPropagation(); navigate(-1); }}
            className="w-11 h-11 rounded-full flex items-center justify-center"
            style={{ background: "rgba(0,0,0,0.4)", color: "white", backdropFilter: "blur(8px)" }}
            aria-label="Close slideshow"
          >
            <X size={18} />
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); togglePhotoFavourite(slide.photo.id); }}
              className="w-11 h-11 rounded-full flex items-center justify-center"
              style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(8px)" }}
              aria-label={slide.photo.isFavourite ? "Remove from favourites" : "Add to favourites"}
            >
              <Heart
                size={18}
                fill={slide.photo.isFavourite ? "var(--gold)" : "none"}
                stroke={slide.photo.isFavourite ? "var(--gold)" : "white"}
              />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setShowSettings(!showSettings); }}
              className="w-11 h-11 rounded-full flex items-center justify-center"
              style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(8px)" }}
              aria-label="Slideshow settings"
            >
              <Settings size={18} color="white" />
            </button>
          </div>
        </motion.div>
      )}

      {/* Settings panel */}
      {showSettings && (
        <div
          className="absolute top-28 right-4 z-30 rounded-2xl p-4 shadow-xl"
          style={{ background: "rgba(26,24,20,0.92)", backdropFilter: "blur(16px)", width: "220px" }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-white font-semibold" style={{ fontSize: "14px" }}>Slideshow</span>
            <button onClick={() => setShowSettings(false)} aria-label="Close settings">
              <X size={16} color="rgba(255,255,255,0.6)" />
            </button>
          </div>
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-white/60 mb-2" style={{ fontSize: "12px" }}>Duration per slide</p>
              <div className="flex gap-2">
                {[3, 5, 8, 12].map((d) => (
                  <button
                    key={d}
                    onClick={() => updateDuration(d)}
                    className="flex-1 h-8 rounded-lg text-center transition-colors"
                    style={{
                      background: duration === d ? "var(--gold)" : "rgba(255,255,255,0.12)",
                      color: duration === d ? "#1A1814" : "white",
                      fontSize: "12px",
                      fontWeight: duration === d ? 600 : 400,
                    }}
                  >
                    {d}s
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-white/60 mb-2" style={{ fontSize: "12px" }}>Transition</p>
              <div className="grid grid-cols-3 gap-2">
                {(["Fade", "Dissolve", "None"] as SlideshowTransition[]).map((transition) => (
                  <button
                    key={transition}
                    onClick={() => updateTransition(transition)}
                    className="h-8 rounded-lg text-center"
                    style={{
                      background: preferences.transition === transition ? "var(--gold)" : "rgba(255,255,255,0.12)",
                      color: preferences.transition === transition ? "#1A1814" : "white",
                      fontSize: "11px",
                      fontWeight: preferences.transition === transition ? 600 : 400,
                    }}
                  >
                    {transition}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Location info — bottom left */}
      <div className="absolute bottom-0 left-0 right-0 z-20 px-5 pb-8">
        <motion.div
          key={slide.photo.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <div className="flex items-center gap-2 mb-2">
            <span style={{ fontSize: "28px" }}>{slide.countryFlag}</span>
            <div>
              <p className="text-white font-semibold" style={{ fontSize: "18px", letterSpacing: "-0.01em" }}>
                {slide.country}
              </p>
              {slide.photo.location && (
                <p className="text-white/70" style={{ fontSize: "13px" }}>
                  {slide.photo.location}
                </p>
              )}
            </div>
          </div>
          <p className="text-white/60 mb-1" style={{ fontSize: "12px" }}>
            {slide.tripTitle} · {slide.tripDate}
          </p>
          {slide.photo.caption && (
            <p className="text-white/80" style={{ fontSize: "14px", lineHeight: 1.4 }}>
              "{slide.photo.caption}"
            </p>
          )}
        </motion.div>

        {/* Playback controls */}
        {showControls && (
          <motion.div
            className="flex items-center justify-center gap-6 mt-5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <button
              onClick={(e) => { e.stopPropagation(); goPrev(); }}
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(8px)" }}
              aria-label="Previous image"
            >
              <SkipBack size={20} fill="white" strokeWidth={0} />
            </button>

            <button
              onClick={(e) => { e.stopPropagation(); setPlaying(!playing); resetHideTimer(); }}
              className="w-16 h-16 rounded-full flex items-center justify-center shadow-lg"
              style={{ background: "var(--gold)" }}
              aria-label={playing ? "Pause slideshow" : "Play slideshow"}
            >
              {playing
                ? <Pause size={24} fill="#1A1814" strokeWidth={0} />
                : <Play size={24} fill="#1A1814" strokeWidth={0} style={{ marginLeft: "2px" }} />
              }
            </button>

            <button
              onClick={(e) => { e.stopPropagation(); goNext(); }}
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(8px)" }}
              aria-label="Next image"
            >
              <SkipForward size={20} fill="white" strokeWidth={0} />
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
