import { useNavigate } from "react-router";
import { getCountry } from "../data/countries";
import { Globe, Camera, Plane, MapPin, Star, Clock, BarChart2, Info } from "lucide-react";
import { useAppData } from "../contexts/AppDataContext";

function StatCard({ icon: Icon, iconColor, value, label, sublabel }: {
  icon: typeof Globe;
  iconColor: string;
  value: string | number;
  label: string;
  sublabel?: string;
}) {
  return (
    <div className="flex-1 min-w-0 rounded-2xl p-4" style={{ background: "var(--card)" }}>
      <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: iconColor + "22" }}>
        <Icon size={18} color={iconColor} />
      </div>
      <p style={{ fontSize: "28px", fontWeight: 700, color: "var(--foreground)", letterSpacing: "-0.02em", lineHeight: 1 }}>{value}</p>
      <p className="mt-1" style={{ fontSize: "12px", fontWeight: 500, color: "var(--muted-foreground)" }}>{label}</p>
      {sublabel && <p style={{ fontSize: "11px", color: "var(--muted-foreground)", opacity: 0.7 }}>{sublabel}</p>}
    </div>
  );
}

export function StatisticsScreen() {
  const navigate = useNavigate();
  const { state, statistics: stats } = useAppData();
  if (!state || !stats) return null;
  const pct = Math.min(100, Math.round((stats.worldCountriesVisited / stats.totalCountries) * 100));
  const otherPlaces = stats.countriesVisited - stats.worldCountriesVisited;
  const maxTripsInYear = Math.max(1, ...stats.tripsByYear.map((y) => y.count));
  const visitedIds = [...new Set(state.trips.map((trip) => trip.countryId))];
  const continentCounts = new Map<string, number>();
  visitedIds.forEach((id) => { const continent = getCountry(id)?.continent ?? "World"; continentCounts.set(continent, (continentCounts.get(continent) ?? 0) + 1); });
  const continentBreakdown = [...continentCounts].map(([continent, count]) => ({ continent, count }));

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="flex-shrink-0 px-5 pt-4 pb-3 border-b" style={{ borderColor: "var(--border)" }}>
        <h1 style={{ fontSize: "24px", fontWeight: 600, letterSpacing: "-0.02em", color: "var(--foreground)" }}>Insights</h1>
        <p style={{ fontSize: "13px", color: "var(--muted-foreground)", marginTop: "2px" }}>A living summary of your atlas</p>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        {/* Top stats grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <StatCard icon={Globe} iconColor="var(--gold)" value={stats.countriesVisited} label="Countries visited" sublabel={`${pct}% of the world`} />
          <StatCard icon={Plane} iconColor="#8FB8AD" value={stats.totalTrips} label="Trips taken" sublabel={`${continentBreakdown.length} continents`} />
          <StatCard icon={Clock} iconColor="#D4917A" value={stats.totalTravelDays} label="Travel days" />
          <StatCard icon={Camera} iconColor="#7A9DC0" value={stats.totalPhotos} label="Photos saved" />
        </div>

        {/* World coverage */}
        <div className="rounded-2xl p-4 mb-4" style={{ background: "var(--card)" }}>
          <div className="flex items-start justify-between mb-3">
            <div>
              <p style={{ fontSize: "15px", fontWeight: 600, color: "var(--foreground)" }}>World explored</p>
              <p style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>{stats.worldCountriesVisited} of {stats.totalCountries} countries{otherPlaces > 0 ? ` · plus ${otherPlaces} ${otherPlaces === 1 ? "territory or region" : "territories and regions"}` : ""}</p>
            </div>
            <button
              className="w-11 h-11 rounded-full flex items-center justify-center"
              style={{ background: "var(--muted)" }}
              title="195 sovereign nations according to the UN. Territories and regions you visit appear on your map but are not part of this total. Percentage is rounded."
              aria-label="About the 195-country total"
            >
              <Info size={13} style={{ color: "var(--muted-foreground)" }} />
            </button>
          </div>

          {/* Progress bar */}
          <div className="relative h-3 rounded-full overflow-hidden mb-2" style={{ background: "var(--muted)" }}>
            <div
              className="absolute left-0 top-0 h-full rounded-full"
              style={{ width: `${pct}%`, background: "var(--gold)", transition: "width 1s ease" }}
            />
          </div>
          <p style={{ fontSize: "12px", color: "var(--gold)", fontWeight: 600 }}>{pct}% of the world</p>

          {/* Continents */}
          <div className="mt-4 flex flex-wrap gap-2">
            {continentBreakdown.map((c) => (
              <div
                key={c.continent}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                style={{ background: "var(--muted)" }}
              >
                <div className="w-2 h-2 rounded-full" style={{ background: "var(--gold)" }} />
                <span style={{ fontSize: "12px", color: "var(--foreground)", fontWeight: 500 }}>{c.continent}</span>
                <span style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>· {c.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Trips by year chart */}
        <div className="rounded-2xl p-4 mb-4" style={{ background: "var(--card)" }}>
          <p className="mb-4" style={{ fontSize: "15px", fontWeight: 600, color: "var(--foreground)" }}>Trips by year</p>
          <div className="flex items-end gap-2" style={{ height: "80px" }}>
            {stats.tripsByYear.map(({ year, count }) => (
              <div key={year} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full rounded-t-md transition-all"
                  style={{
                    height: `${(count / maxTripsInYear) * 64}px`,
                    background: count > 0 ? "var(--gold)" : "var(--muted)",
                    minHeight: count > 0 ? "8px" : "4px",
                    opacity: count > 0 ? 1 : 0.4,
                  }}
                />
                <span style={{ fontSize: "9px", color: "var(--muted-foreground)", fontWeight: 500 }}>{year.toString().slice(2)}</span>
              </div>
            ))}
          </div>
          {stats.tripsByYear.length > 0 ? <div className="flex justify-between mt-1"><span style={{ fontSize: "10px", color: "var(--muted-foreground)" }}>{stats.tripsByYear[0].year}</span><span style={{ fontSize: "10px", color: "var(--muted-foreground)" }}>{stats.tripsByYear.at(-1)?.year}</span></div> : <p className="text-center text-xs" style={{ color: "var(--muted-foreground)" }}>Your yearly travel pattern will appear after your first trip.</p>}
        </div>

        {/* Highlights */}
        <div className="rounded-2xl p-4 mb-4" style={{ background: "var(--card)" }}>
          <p className="mb-3" style={{ fontSize: "15px", fontWeight: 600, color: "var(--foreground)" }}>Highlights</p>
          <div className="flex flex-col gap-3">
            {[
              { label: "Most visited", value: stats.mostVisitedCountry ?? "Add a trip to begin", icon: "🌍" },
              { label: "Favourite country", value: state.favouriteCountryId ? getCountry(state.favouriteCountryId)?.name ?? state.favouriteCountryId : "Not chosen", icon: "💛" },
              { label: "First trip", value: stats.firstTrip ? `${stats.firstTrip.country} · ${new Date(`${stats.firstTrip.startDate}T00:00:00`).getFullYear()}` : "No trips yet", icon: "✈️" },
              { label: "Most recent", value: stats.latestTrip ? `${stats.latestTrip.country} · ${new Date(`${stats.latestTrip.endDate}T00:00:00`).getFullYear()}` : "No trips yet", icon: "📍" },
            ].map(({ label, value, icon }) => (
              <div key={label} className="flex items-center justify-between">
                <p style={{ fontSize: "13px", color: "var(--muted-foreground)" }}>{label}</p>
                <div className="flex items-center gap-1.5">
                  <span style={{ fontSize: "14px" }}>{icon}</span>
                  <p style={{ fontSize: "13px", fontWeight: 500, color: "var(--foreground)" }}>{value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Visited countries list */}
        <div className="rounded-2xl p-4 mb-6" style={{ background: "var(--card)" }}>
          <p className="mb-3" style={{ fontSize: "15px", fontWeight: 600, color: "var(--foreground)" }}>Countries visited</p>
          <div className="flex flex-wrap gap-2">
            {visitedIds.map((id) => {
              const c = getCountry(id);
              if (!c) return null;
              return (
                <button
                  key={id}
                  onClick={() => navigate(`/app/country/${id}`)}
                  className="flex min-h-[44px] items-center gap-1.5 px-3 py-1.5 rounded-full transition-opacity active:opacity-70"
                  style={{ background: "var(--gold-light)", border: "1px solid rgba(201,168,76,0.3)" }}
                >
                  <span style={{ fontSize: "14px" }}>{c.flag}</span>
                  <span style={{ fontSize: "12px", fontWeight: 500, color: "#7A6428" }}>{c.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
