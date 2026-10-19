import { Outlet, useLocation, useNavigate } from "react-router";
import { Map, Luggage, Images, BarChart3, User } from "lucide-react";

const NAV_ITEMS = [
  { path: "/app/map", icon: Map, label: "Map" },
  { path: "/app/trips", icon: Luggage, label: "Trips" },
  { path: "/app/memories", icon: Images, label: "Memories" },
  { path: "/app/insights", icon: BarChart3, label: "Insights" },
  { path: "/app/profile", icon: User, label: "Profile" },
];

export function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const isSlideshow = location.pathname === "/app/slideshow";
  const isSubflow = isSlideshow || location.pathname === "/app/add-trip" || location.pathname.startsWith("/app/trip/") || /^\/app\/memories\/[^/]+$/.test(location.pathname);

  const isActive = (path: string) => {
    if (path === "/app/map" && location.pathname === "/app") return true;
    return location.pathname === path || (path !== "/app/map" && location.pathname.startsWith(path));
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Status bar */}
      <div className="flex-shrink-0 h-11 bg-background flex items-center justify-between px-5 pt-2 z-50">
        <span className="text-xs font-semibold" style={{ color: isSlideshow ? "transparent" : "var(--foreground)" }}>9:41</span>
        <div className="absolute left-1/2 -translate-x-1/2 top-2 w-24 h-6 bg-foreground rounded-full opacity-90" />
        <div className="flex items-center gap-1 opacity-70" style={{ color: isSlideshow ? "transparent" : "var(--foreground)" }}>
          <svg viewBox="0 0 24 12" className="w-5 h-3" fill="currentColor">
            <rect x="1" y="4" width="4" height="8" rx="1" />
            <rect x="7" y="2" width="4" height="10" rx="1" />
            <rect x="13" y="0" width="4" height="12" rx="1" />
            <rect x="20" y="3" width="3" height="7" rx="1" opacity="0.3" />
          </svg>
          <svg viewBox="0 0 16 12" className="w-4 h-3" fill="currentColor">
            <rect x="0" y="0" width="15" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none" />
            <rect x="15.5" y="3.5" width="1.5" height="5" rx="0.75" fill="currentColor" />
            <rect x="1.5" y="1.5" width="10" height="9" rx="1" fill="currentColor" />
          </svg>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-hidden">
        <Outlet />
      </div>

      {/* Bottom navigation */}
      {!isSubflow && (
        <nav
          className="flex-shrink-0 bg-background border-t z-50"
          style={{ borderColor: "var(--border)", paddingBottom: "env(safe-area-inset-bottom, 8px)" }}
        >
          <div className="flex items-stretch h-16">
            {NAV_ITEMS.map(({ path, icon: Icon, label }) => {
              const active = isActive(path);
              return (
                <button
                  key={path}
                  onClick={() => navigate(path)}
                  className="relative flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors min-h-[44px]"
                  style={{
                    color: active ? "var(--gold)" : "var(--muted-foreground)",
                  }}
                  aria-label={label}
                  aria-current={active ? "page" : undefined}
                >
                  <Icon size={22} strokeWidth={active ? 2 : 1.5} />
                  <span className="text-[10px] font-medium leading-none">{label}</span>
                  {active && (
                    <span
                      className="absolute bottom-1 w-1 h-1 rounded-full"
                      style={{ background: "var(--gold)" }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </nav>
      )}

      {/* Home indicator */}
      <div className="flex-shrink-0 flex justify-center pb-1 bg-background">
        <div className="w-32 h-1 rounded-full opacity-30" style={{ background: "var(--foreground)" }} />
      </div>
    </div>
  );
}
