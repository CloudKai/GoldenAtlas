import { createBrowserRouter, redirect } from "react-router";
import { SignInScreen } from "./components/SignInScreen";
import { SignUpScreen } from "./components/SignUpScreen";
import { LaunchScreen } from "./components/LaunchScreen";
import { OnboardingScreen } from "./components/OnboardingScreen";
import { AppLayout } from "./components/AppLayout";
import { MapScreen } from "./components/MapScreen";
import { TimelineScreen } from "./components/TimelineScreen";
import { SlideshowScreen } from "./components/SlideshowScreen";
import { StatisticsScreen } from "./components/StatisticsScreen";
import { ProfileScreen } from "./components/ProfileScreen";
import { CountryScreen } from "./components/CountryScreen";
import { AddTripScreen } from "./components/AddTripScreen";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { MemoriesScreen } from "./components/MemoriesScreen";
import { TripDetailScreen } from "./components/TripDetailScreen";
import { LegalScreen } from "./components/LegalScreen";
import { AdminLoginScreen } from "./components/AdminLoginScreen";
import { AdminProtectedRoute } from "./components/AdminProtectedRoute";
import { AdminScreen } from "./components/AdminScreen";
import { NotFoundScreen } from "./components/NotFoundScreen";
import { RouteErrorScreen } from "./components/RouteErrorScreen";

export const router = createBrowserRouter([
  {
    ErrorBoundary: RouteErrorScreen,
    children: [
      {
        path: "/",
        Component: LaunchScreen,
      },
      {
        path: "/signin",
        Component: SignInScreen,
      },
      {
        path: "/signup",
        Component: SignUpScreen,
      },
      {
        path: "/onboarding",
        Component: OnboardingScreen,
      },
      {
        path: "/legal/:document",
        Component: LegalScreen,
      },
      {
        path: "/admin-login",
        Component: AdminLoginScreen,
      },
      {
        Component: AdminProtectedRoute,
        children: [{ path: "/admin", Component: AdminScreen }],
      },
      {
        Component: ProtectedRoute,
        children: [
          {
            path: "/app",
            Component: AppLayout,
            children: [
              { index: true, Component: MapScreen },
              { path: "map", Component: MapScreen },
              { path: "trips", Component: TimelineScreen },
              { path: "timeline", loader: () => redirect("/app/trips") },
              { path: "memories", Component: MemoriesScreen },
              { path: "memories/:photoId", Component: MemoriesScreen },
              { path: "slideshow", Component: SlideshowScreen },
              { path: "insights", Component: StatisticsScreen },
              { path: "stats", loader: () => redirect("/app/insights") },
              { path: "profile", Component: ProfileScreen },
              { path: "country/:id", Component: CountryScreen },
              { path: "trip/:tripId", Component: TripDetailScreen },
              { path: "add-trip", Component: AddTripScreen },
            ],
          },
        ],
      },
      { path: "*", Component: NotFoundScreen },
    ],
  },
]);
