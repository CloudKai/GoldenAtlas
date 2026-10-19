import { useState } from "react";
import { hasCompletedOnboarding, markOnboardingComplete } from "../lib/preferences";
import { OnboardingScreen } from "./OnboardingScreen";
import { WelcomeScreen } from "./WelcomeScreen";
import { Navigate } from "react-router";
import { useAppData } from "../contexts/AppDataContext";

export function LaunchScreen() {
  const [complete, setComplete] = useState(hasCompletedOnboarding);
  const { ready, user } = useAppData();

  if (!complete) {
    return <OnboardingScreen onComplete={() => { markOnboardingComplete(); setComplete(true); }} />;
  }

  if (ready && user) return <Navigate to="/app/map" replace />;

  return <WelcomeScreen />;
}
