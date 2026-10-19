import { useState } from "react";
import { useNavigate } from "react-router";
import { ChevronRight, Globe, BookOpen, Play, Shield } from "lucide-react";
import { markOnboardingComplete } from "../lib/preferences";

const SLIDES = [
  {
    icon: Globe,
    colour: "#C9A84C",
    image: "https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=600&q=80&auto=format&fit=crop",
    title: "Mark your world",
    body: "Tap any country to mark it as visited. Watch your map fill with gold as your travels grow.",
  },
  {
    icon: BookOpen,
    colour: "#8FB8AD",
    image: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=600&q=80&auto=format&fit=crop",
    title: "Save your memories",
    body: "Add trips, journal entries, photos, and the moments that matter. Organised beautifully by country.",
  },
  {
    icon: Play,
    colour: "#D4917A",
    image: "https://images.unsplash.com/photo-1549517045-bc93de199c7d?w=600&q=80&auto=format&fit=crop",
    title: "Relive your journeys",
    body: "A cinematic slideshow brings your travels back to life — full screen, beautiful, yours alone.",
  },
  {
    icon: Shield,
    colour: "#7A9DC0",
    image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&q=80&auto=format&fit=crop",
    title: "Your privacy, always",
    body: "Everything is private by default. No social feed, no rankings. Your memories belong only to you.",
  },
];

export function OnboardingScreen({ onComplete }: { onComplete?: () => void }) {
  const navigate = useNavigate();
  const [index, setIndex] = useState(0);
  const slide = SLIDES[index];
  const Icon = slide.icon;
  const isLast = index === SLIDES.length - 1;

  const finish = () => {
    markOnboardingComplete();
    if (onComplete) onComplete();
    else navigate("/", { replace: true });
  };

  const next = () => {
    if (isLast) finish();
    else setIndex((i) => i + 1);
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Skip */}
      <div className="flex justify-end px-5 pt-14 pb-2">
        <button
          onClick={finish}
          className="h-11 px-2"
          style={{ color: "var(--muted-foreground)", fontSize: "14px", fontWeight: 500 }}
        >
          Skip
        </button>
      </div>

      {/* Image */}
      <div className="relative mx-5 rounded-3xl overflow-hidden" style={{ height: "280px" }}>
        <img
          key={slide.image}
          src={slide.image}
          alt={slide.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, transparent 50%, rgba(26,24,20,0.5) 100%)" }} />
        <div
          className="absolute bottom-4 left-4 w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: slide.colour }}
        >
          <Icon size={20} color="#1A1814" />
        </div>
      </div>

      {/* Text */}
      <div className="flex-1 flex flex-col justify-center px-6 py-6">
        <h2 className="mb-3" style={{ fontSize: "28px", fontWeight: 600, letterSpacing: "-0.02em", color: "var(--foreground)" }}>
          {slide.title}
        </h2>
        <p style={{ fontSize: "16px", lineHeight: 1.6, color: "var(--muted-foreground)" }}>
          {slide.body}
        </p>
      </div>

      {/* Progress + Next */}
      <div className="px-6 pb-10 flex items-center justify-between">
        {/* Dots */}
        <div className="flex items-center gap-2">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              className="flex h-11 items-center justify-center rounded-full transition-all"
              aria-label={`Go to onboarding step ${i + 1} of ${SLIDES.length}: ${SLIDES[i].title}`}
              aria-current={i === index ? "step" : undefined}
              style={{
                width: i === index ? "32px" : "20px",
              }}
            ><span className="block h-2 rounded-full" style={{ width: i === index ? "24px" : "8px", background: i === index ? "var(--gold)" : "var(--muted)" }} /></button>
          ))}
        </div>

        {/* Next button */}
        <button
          onClick={next}
          className="h-14 rounded-2xl px-7 flex items-center gap-2 transition-opacity active:opacity-80"
          style={{ background: "var(--gold)", color: "#1A1814", fontSize: "15px", fontWeight: 600 }}
        >
          {isLast ? "Get Started" : "Continue"}
          {!isLast && <ChevronRight size={18} />}
        </button>
      </div>
    </div>
  );
}
