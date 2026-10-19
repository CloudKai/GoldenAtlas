import { useState } from "react";
import { useNavigate } from "react-router";
import { Shield } from "lucide-react";
import { useAppData } from "../contexts/AppDataContext";

export function WelcomeScreen() {
  const navigate = useNavigate();
  const { startGuest } = useAppData();
  const [startingGuest, setStartingGuest] = useState(false);
  const [guestError, setGuestError] = useState("");

  const tryAsGuest = async () => {
    setStartingGuest(true);
    setGuestError("");
    try { await startGuest(); navigate("/app/map", { replace: true }); }
    catch (reason) { setGuestError(reason instanceof Error ? reason.message : "Guest mode couldn’t start. Try again."); setStartingGuest(false); }
  };

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#1A1814]">
      {/* Background image */}
      <img
        src="https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=900&q=85&auto=format&fit=crop"
        alt="Travel landscape"
        className="absolute inset-0 w-full h-full object-cover opacity-60"
      />

      {/* Gradient overlays */}
      <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(26,24,20,0.3) 0%, transparent 40%, rgba(26,24,20,0.85) 75%, rgba(26,24,20,0.98) 100%)" }} />

      {/* Content */}
      <div className="relative h-full flex flex-col justify-between px-6 py-safe">
        {/* Logo */}
        <div className="pt-16 flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "var(--gold)" }}
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="#1A1814" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M2 12h20M12 2c-2.5 3-4 6.5-4 10s1.5 7 4 10M12 2c2.5 3 4 6.5 4 10s-1.5 7-4 10" />
              <path d="M4.93 5.5Q8.5 7 12 7t7.07-1.5M4.93 18.5Q8.5 17 12 17t7.07 1.5" />
            </svg>
          </div>
          <span className="text-white tracking-wide" style={{ fontSize: "20px", fontWeight: 600, letterSpacing: "0.05em" }}>GOLDEN ATLAS</span>
        </div>

        {/* Hero text and actions */}
        <div className="pb-8">
          <p className="text-white/50 uppercase tracking-widest mb-3" style={{ fontSize: "11px", fontWeight: 500 }}>Your private travel diary</p>
          <h1 className="text-white mb-2" style={{ fontSize: "34px", fontWeight: 600, lineHeight: 1.15, letterSpacing: "-0.02em" }}>
            Your travels,<br />remembered<br />beautifully.
          </h1>
          <p className="text-white/60 mt-4 mb-8" style={{ fontSize: "15px", lineHeight: 1.5 }}>
            Mark countries, save memories, and revisit your journeys through a private world of your own.
          </p>

          {/* Auth buttons */}
          <div className="flex flex-col gap-3">
            <button
              onClick={() => navigate("/signup")}
              className="w-full h-14 rounded-2xl flex items-center justify-center transition-opacity active:opacity-80"
              style={{ background: "var(--gold)", color: "#1A1814", fontSize: "16px", fontWeight: 600 }}
            >
              Create Account
            </button>

            <button
              onClick={() => navigate("/signin")}
              className="w-full h-14 rounded-2xl flex items-center justify-center border border-white/25 backdrop-blur-sm transition-opacity active:opacity-80"
              style={{ color: "white", fontSize: "16px", fontWeight: 500, background: "rgba(255,255,255,0.08)" }}
            >
              Sign In
            </button>

            <button
              type="button"
              onClick={tryAsGuest}
              disabled={startingGuest}
              className="w-full h-12 rounded-2xl flex items-center justify-center transition-opacity active:opacity-80 disabled:opacity-60"
              style={{ color: "var(--gold)", fontSize: "15px", fontWeight: 600 }}
            >
              {startingGuest ? "Starting…" : "Try as guest"}
            </button>
            <p className="text-center -mt-1" role={guestError ? "alert" : undefined} style={{ fontSize: "11px", lineHeight: 1.45, color: guestError ? "#F08A8A" : "rgba(255,255,255,0.45)" }}>
              {guestError || "No account needed. Guest trips and photos stay on this device and are deleted when you leave."}
            </p>

            <div className="flex items-center gap-3 my-1">
              <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.15)" }} />
              <span className="text-white/40" style={{ fontSize: "12px" }}>or continue with</span>
              <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.15)" }} />
            </div>

            <div className="flex gap-3">
              <button
                disabled
                title="Available after provider setup"
                className="flex-1 h-12 rounded-xl flex items-center justify-center gap-2 border border-white/20 opacity-45 cursor-not-allowed"
                style={{ color: "white", fontSize: "14px", fontWeight: 500, background: "rgba(255,255,255,0.08)" }}
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Google
              </button>
              <button
                disabled
                title="Available after provider setup"
                className="flex-1 h-12 rounded-xl flex items-center justify-center gap-2 border border-white/20 opacity-45 cursor-not-allowed"
                style={{ color: "white", fontSize: "14px", fontWeight: 500, background: "rgba(255,255,255,0.08)" }}
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                </svg>
                Apple
              </button>
            </div>
            <p className="text-center text-white/45" style={{ fontSize: "10px" }}>Google and Apple are available after provider setup.</p>
          </div>

          {/* Privacy */}
          <div className="mt-6 flex items-center justify-center gap-2">
            <Shield size={12} className="text-white/30" />
            <p className="text-white/30" style={{ fontSize: "11px" }}>
              Private by default.{" "}
              <button onClick={() => navigate("/legal/privacy")} className="text-white/50 underline-offset-2 underline">Privacy Policy</button>
              {" · "}
              <button onClick={() => navigate("/legal/terms")} className="text-white/50 underline-offset-2 underline">Terms</button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
