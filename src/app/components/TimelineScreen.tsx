import { useState } from "react";
import { useNavigate } from "react-router";
import { Search, Filter, ChevronDown, Heart, Camera, Calendar, X } from "lucide-react";
import type { Trip } from "../types/domain";
import { useAppData } from "../contexts/AppDataContext";
import { daysUntil, hasStarted, todayISO } from "../lib/trip-days";
import { searchTrips } from "../lib/trip-search";

function formatDateRange(start: string, end: string) {
  const s = new Date(start);
  const e = new Date(end);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  if (s.getFullYear() === e.getFullYear() && s.getMonth() === e.getMonth()) {
    return `${months[s.getMonth()]} ${s.getFullYear()}`;
  }
  if (s.getFullYear() === e.getFullYear()) {
    return `${months[s.getMonth()]}–${months[e.getMonth()]} ${s.getFullYear()}`;
  }
  return `${months[s.getMonth()]} ${s.getFullYear()} – ${months[e.getMonth()]} ${e.getFullYear()}`;
}

function groupTripsByYear(trips: Trip[]): Record<number, Trip[]> {
  const sorted = [...trips].sort(
    (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
  );
  return sorted.reduce<Record<number, Trip[]>>((acc, trip) => {
    const year = new Date(trip.startDate).getFullYear();
    if (!acc[year]) acc[year] = [];
    acc[year].push(trip);
    return acc;
  }, {});
}

export function TimelineScreen() {
  const navigate = useNavigate();
  const { state } = useAppData();
  const trips = state?.trips ?? [];
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [filterFavourites, setFilterFavourites] = useState(false);

  // Search looks through names, places, companions, journals, every day's diary, and photo captions.
  const results = searchTrips(trips, search);
  const matchesByTrip = new Map(results.map((result) => [result.trip.id, result.matches]));
  const filtered = results.map((result) => result.trip).filter((trip) => !filterFavourites || trip.isFavourite);

  // Trips planned ahead sit in their own section, soonest first; everything that has started is grouped by year.
  const today = todayISO();
  const upcoming = filtered.filter((trip) => !hasStarted(trip, today)).sort((a, b) => a.startDate.localeCompare(b.startDate));
  const grouped = groupTripsByYear(filtered.filter((trip) => hasStarted(trip, today)));
  const years = Object.keys(grouped).map(Number).sort((a, b) => b - a);
  const sections = [
    ...(upcoming.length ? [{ key: "upcoming", label: "Upcoming", trips: upcoming }] : []),
    ...years.map((year) => ({ key: String(year), label: String(year), trips: grouped[year] })),
  ];

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="flex-shrink-0 px-5 pt-4 pb-3 border-b" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center justify-between mb-3">
          <div><h1 style={{ fontSize: "24px", fontWeight: 600, letterSpacing: "-0.02em", color: "var(--foreground)" }}>Trips</h1><p className="text-xs" style={{ color: "var(--muted-foreground)" }}>Past journeys and the ones you are planning</p></div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSearch(!showSearch)}
              className="w-11 h-11 rounded-full flex items-center justify-center"
              style={{ background: showSearch ? "var(--gold)" : "var(--muted)", color: showSearch ? "#1A1814" : "var(--foreground)" }}
              aria-label={showSearch ? "Hide trip search" : "Search trips"} aria-pressed={showSearch}>
              <Search size={16} />
            </button>
            <button
              onClick={() => setFilterFavourites(!filterFavourites)}
              className="w-11 h-11 rounded-full flex items-center justify-center"
              style={{ background: filterFavourites ? "var(--gold)" : "var(--muted)", color: filterFavourites ? "#1A1814" : "var(--foreground)" }}
              aria-label="Show favourite trips only" aria-pressed={filterFavourites}>
              <Heart size={16} fill={filterFavourites ? "currentColor" : "none"} />
            </button>
          </div>
        </div>

        {showSearch && (
          <div className="flex items-center gap-2 h-10 rounded-xl px-3" style={{ background: "var(--input-background)" }}>
            <Search size={14} style={{ color: "var(--muted-foreground)" }} />
            <input
              autoFocus
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search trips, diaries, captions, places…"
              className="flex-1 bg-transparent outline-none"
              style={{ fontSize: "14px", color: "var(--foreground)" }}
            />
            {search && (
              <button onClick={() => setSearch("")}>
                <X size={14} style={{ color: "var(--muted-foreground)" }} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full pb-16">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: "var(--muted)" }}>
              <Calendar size={28} style={{ color: "var(--muted-foreground)" }} />
            </div>
            <p style={{ fontSize: "17px", fontWeight: 600, color: "var(--foreground)" }}>{trips.length ? "No trips found" : "Your atlas is ready for its first trip"}</p>
            <p className="mt-1 text-center" style={{ fontSize: "14px", color: "var(--muted-foreground)" }}>
              {trips.length === 0 ? "Add dates, cities, notes and photos. Your map and insights will update automatically." : filterFavourites ? "No favourite trips yet. Mark a trip as favourite." : "Try a different search."}
            </p>
            {!trips.length && <button onClick={() => navigate("/app/add-trip")} className="mt-5 h-12 rounded-xl px-5 font-semibold" style={{ background: "var(--gold)", color: "#1a1814" }}>Add your first trip</button>}
          </div>
        ) : (
          sections.map((section) => (
            <div key={section.key}>
              {/* Year header */}
              <div className="sticky top-0 z-10 flex items-center gap-3 py-3" style={{ background: "var(--background)" }}>
                <span style={{ fontSize: "22px", fontWeight: 700, color: "var(--gold)", letterSpacing: "-0.02em" }}>{section.label}</span>
                <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
                <span style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>
                  {section.trips.length} {section.trips.length === 1 ? "trip" : "trips"}
                </span>
              </div>

              {/* Trips */}
              {section.trips.map((trip, i) => (
                <button
                  key={trip.id}
                  onClick={() => navigate(`/app/trip/${trip.id}`)}
                  className="w-full flex gap-4 mb-4 text-left transition-opacity active:opacity-80"
                >
                  {/* Timeline line */}
                  <div className="flex flex-col items-center flex-shrink-0 pt-1">
                    <div className="w-3 h-3 rounded-full flex-shrink-0 border-2" style={{ background: "var(--gold)", borderColor: "var(--gold)" }} />
                    {i < section.trips.length - 1 && (
                      <div className="flex-1 w-px mt-1" style={{ background: "var(--border)", minHeight: "60px" }} />
                    )}
                  </div>

                  {/* Card */}
                  <div className="flex-1 pb-1">
                    <div className="flex items-start gap-3 p-3 rounded-2xl overflow-hidden" style={{ background: "var(--card)" }}>
                      {/* Cover image */}
                      <div className="relative flex-shrink-0 rounded-xl overflow-hidden" style={{ width: "80px", height: "80px" }}>
                        <img src={trip.coverImage} alt={trip.title} className="w-full h-full object-cover" />
                        {trip.isFavourite && (
                          <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: "rgba(0,0,0,0.4)" }}>
                            <Heart size={10} fill="var(--gold)" strokeWidth={0} />
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span style={{ fontSize: "16px" }}>{trip.countryFlag}</span>
                          <span className="truncate" style={{ fontSize: "15px", fontWeight: 600, color: "var(--foreground)" }}>{trip.title}</span>
                        </div>
                        <p className="mb-1.5" style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>
                          {trip.city}, {trip.country}
                        </p>
                        <p className="mb-2" style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>
                          {formatDateRange(trip.startDate, trip.endDate)} · {trip.duration} {trip.duration === 1 ? "day" : "days"}{!hasStarted(trip, today) ? ` · starts in ${daysUntil(trip, today)} ${daysUntil(trip, today) === 1 ? "day" : "days"}` : ""}
                        </p>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1">
                            <Camera size={11} style={{ color: "var(--muted-foreground)" }} />
                            <span style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>{trip.photos.length}</span>
                          </div>
                          <span style={{ fontSize: "13px" }}>{trip.mood}</span>
                          {"⭐".repeat(trip.rating).slice(0, trip.rating).split("").map((_, i) => (
                            <span key={i} style={{ fontSize: "10px" }}>★</span>
                          ))}
                        </div>
                        {(matchesByTrip.get(trip.id) ?? []).slice(0, 2).map((match, index) => (
                          <p key={index} className="mt-2 line-clamp-2" style={{ fontSize: "12px", lineHeight: 1.4, color: "var(--muted-foreground)" }}>
                            <span style={{ color: "var(--gold)", fontWeight: 600 }}>In {match.label}: </span>{match.snippet}
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ))
        )}
        <div className="h-6" />
      </div>
    </div>
  );
}
