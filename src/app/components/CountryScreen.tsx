import { useState } from "react";
import { useParams, useNavigate } from "react-router";
import { ChevronLeft, Plus, Play, Heart, Camera, MapPin, Calendar, MoreHorizontal, Grid, List, Clock, X } from "lucide-react";
import { getCountry, resolveCountryId } from "../data/countries";
import { useAppData } from "../contexts/AppDataContext";
import { allPhotos } from "../lib/selectors";

type ViewMode = "grid" | "list" | "timeline";

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

export function CountryScreen() {
  const { id: routeId } = useParams<{ id: string }>();
  const id = routeId ? resolveCountryId(routeId) : undefined;
  const navigate = useNavigate();
  const { state, setFavouriteCountry } = useAppData();
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const isFavourite = state?.favouriteCountryId === id;

  const fixture = getCountry(id) ?? null;
  const trips = id ? (state?.trips ?? []).filter((trip) => trip.countryId === id) : [];
  const photos = state ? allPhotos(state).filter((photo) => photo.countryId === id) : [];
  const dates = trips.flatMap((trip) => [trip.startDate, trip.endDate]).sort();
  const country = fixture ? { ...fixture, visited: trips.length > 0, tripCount: trips.length, photoCount: photos.length, firstVisit: dates[0], lastVisit: dates.at(-1), bucketList: Boolean(id && state?.bucketListIds.includes(id)) } : null;

  if (!country) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-background">
        <p style={{ color: "var(--muted-foreground)" }}>Country not found.</p>
        <button onClick={() => navigate("/app/map")} className="mt-4" style={{ color: "var(--gold)" }}>← Back to map</button>
      </div>
    );
  }

  const fullscreenPhoto = selectedPhoto ? photos.find((p) => p.id === selectedPhoto) : null;

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden">
      {/* Hero */}
      <div className="relative flex-shrink-0" style={{ height: "220px" }}>
        {trips[0]?.coverImage ? (
          <img
            src={trips[0].coverImage}
            alt={country.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center" style={{ background: "linear-gradient(135deg, var(--gold-light), var(--muted))" }} role="img" aria-label={country.name}>
            <span style={{ fontSize: "72px" }} aria-hidden>{country.flag}</span>
          </div>
        )}
        <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, transparent 40%, rgba(0,0,0,0.6) 100%)" }} />

        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="absolute top-3 left-4 w-11 h-11 rounded-full flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(8px)" }}
          aria-label="Back"
        >
          <ChevronLeft size={20} color="white" />
        </button>

        {/* Actions */}
        <div className="absolute top-3 right-4 flex gap-2">
          <button
            onClick={() => navigate(`/app/slideshow?scope=country&id=${id}`)}
            className="w-11 h-11 rounded-full flex items-center justify-center"
            style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(8px)" }}
            aria-label={`Play ${country.name} memories`}
          >
            <Play size={16} fill="white" strokeWidth={0} />
          </button>
          <button
            onClick={() => setFavouriteCountry(isFavourite ? undefined : id)}
            className="w-11 h-11 rounded-full flex items-center justify-center"
            aria-label={isFavourite ? `Remove ${country.name} as favourite country` : `Make ${country.name} your favourite country`}
            style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(8px)" }}
          >
            <Heart size={16} fill={isFavourite ? "var(--gold)" : "none"} stroke={isFavourite ? "var(--gold)" : "white"} />
          </button>
        </div>

        {/* Country info */}
        <div className="absolute bottom-4 left-5">
          <div className="flex items-center gap-2 mb-1">
            <span style={{ fontSize: "28px" }}>{country.flag}</span>
            <h1 className="text-white" style={{ fontSize: "24px", fontWeight: 700, letterSpacing: "-0.02em" }}>{country.name}</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <MapPin size={12} color="rgba(255,255,255,0.7)" />
              <span className="text-white/70" style={{ fontSize: "12px" }}>{country.tripCount} trips</span>
            </div>
            <div className="flex items-center gap-1">
              <Camera size={12} color="rgba(255,255,255,0.7)" />
              <span className="text-white/70" style={{ fontSize: "12px" }}>{country.photoCount} photos</span>
            </div>
            {country.lastVisit && (
              <div className="flex items-center gap-1">
                <Calendar size={12} color="rgba(255,255,255,0.7)" />
                <span className="text-white/70" style={{ fontSize: "12px" }}>Last: {new Date(country.lastVisit).getFullYear()}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Segment control + Add */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-2.5 border-b" style={{ borderColor: "var(--border)" }}>
        {/* View mode */}
        <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: "var(--muted)" }}>
          {([
            { mode: "list" as ViewMode, icon: List },
            { mode: "grid" as ViewMode, icon: Grid },
            { mode: "timeline" as ViewMode, icon: Clock },
          ]).map(({ mode, icon: Icon }) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className="w-11 h-11 rounded-lg flex items-center justify-center transition-all"
              aria-label={`${mode} view`} aria-pressed={viewMode === mode}
              style={{
                background: viewMode === mode ? "var(--card)" : "transparent",
                color: viewMode === mode ? "var(--gold)" : "var(--muted-foreground)",
                boxShadow: viewMode === mode ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
              }}
            >
              <Icon size={14} />
            </button>
          ))}
        </div>

        <button
          onClick={() => navigate(`/app/add-trip?country=${country.id}`)}
          className="flex items-center gap-1.5 h-11 px-3 rounded-xl"
          style={{ background: "var(--gold)", color: "#1A1814", fontSize: "13px", fontWeight: 600 }}
        >
          <Plus size={14} strokeWidth={2.5} />
          Add trip
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Trips list */}
        {viewMode === "list" && (
          <div className="px-4 py-3">
            {trips.map((trip) => (
              <article key={trip.id} className="mb-4 rounded-2xl overflow-hidden" style={{ background: "var(--card)" }}>
                {/* Cover */}
                <div className="relative" style={{ height: "160px" }}>
                  <img src={trip.coverImage} alt={trip.title} className="w-full h-full object-cover" />
                  <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.55) 100%)" }} />
                  <button onClick={() => navigate(`/app/trip/${trip.id}`)} className="absolute inset-0 z-10 text-left" aria-label={`Open ${trip.title}`}><span className="absolute bottom-3 left-3 right-3">
                    <p className="text-white font-semibold" style={{ fontSize: "17px", letterSpacing: "-0.01em" }}>{trip.title}</p>
                    <p className="text-white/70" style={{ fontSize: "12px" }}>{trip.city} · {trip.duration} days</p>
                  </span></button>
                  {trip.isFavourite && (
                    <div className="absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "rgba(0,0,0,0.4)" }}>
                      <Heart size={12} fill="var(--gold)" strokeWidth={0} />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="px-4 py-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar size={13} style={{ color: "var(--muted-foreground)" }} />
                    <span style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>
                      {formatDate(trip.startDate)} – {formatDate(trip.endDate)}
                    </span>
                  </div>
                  {trip.journal && (
                    <p className="line-clamp-2 mb-3" style={{ fontSize: "13px", color: "var(--muted-foreground)", lineHeight: 1.5 }}>
                      {trip.journal}
                    </p>
                  )}
                  <div className="flex gap-2">
                    {trip.photos.slice(0, 4).map((photo) => (
                      <button
                        key={photo.id}
                        onClick={() => navigate(`/app/memories/${photo.id}`)}
                        className="rounded-lg overflow-hidden flex-shrink-0"
                        style={{ width: "56px", height: "56px" }}
                      >
                        <img src={photo.url} alt={photo.caption} className="w-full h-full object-cover" />
                      </button>
                    ))}
                    {trip.photos.length > 4 && (
                      <div className="rounded-lg flex items-center justify-center flex-shrink-0" style={{ width: "56px", height: "56px", background: "var(--muted)" }}>
                        <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--muted-foreground)" }}>+{trip.photos.length - 4}</span>
                      </div>
                    )}
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {trip.places.slice(0, 3).map((place) => (
                      <span
                        key={place}
                        className="px-2 py-0.5 rounded-full"
                        style={{ fontSize: "11px", background: "var(--muted)", color: "var(--muted-foreground)" }}
                      >
                        {place}
                      </span>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {/* Grid view */}
        {viewMode === "grid" && (
          <div className="grid grid-cols-3 gap-0.5 p-0.5">
            {photos.map((photo) => (
              <button
                key={photo.id}
                onClick={() => navigate(`/app/memories/${photo.id}`)}
                className="relative aspect-square overflow-hidden"
              >
                <img src={photo.url} alt={photo.caption} className="w-full h-full object-cover" />
                {photo.isFavourite && (
                  <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: "rgba(0,0,0,0.4)" }}>
                    <Heart size={10} fill="var(--gold)" strokeWidth={0} />
                  </div>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Timeline view */}
        {viewMode === "timeline" && (
          <div className="px-4 py-3">
            {trips.map((trip, i) => (
              <div key={trip.id} className="flex gap-3 mb-4">
                <div className="flex flex-col items-center flex-shrink-0">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm border-2" style={{ background: "var(--gold-light)", borderColor: "var(--gold)" }}>
                    <span style={{ fontSize: "14px" }}>{trip.mood}</span>
                  </div>
                  {i < trips.length - 1 && <div className="w-px flex-1 mt-1" style={{ background: "var(--border)", minHeight: "40px" }} />}
                </div>
                <div className="flex-1 pb-4">
                  <p className="font-semibold mb-0.5" style={{ fontSize: "15px", color: "var(--foreground)" }}>{trip.title}</p>
                  <p style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>{formatDate(trip.startDate)} · {trip.duration} days</p>
                  {trip.favouriteMemory && (
                    <div className="mt-2 p-3 rounded-xl" style={{ background: "var(--card)" }}>
                      <p className="italic" style={{ fontSize: "13px", color: "var(--muted-foreground)", lineHeight: 1.5 }}>"{trip.favouriteMemory}"</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="h-6" />
      </div>

      {/* Full-screen photo viewer */}
      {fullscreenPhoto && (
        <div className="absolute inset-0 z-50 bg-black flex flex-col">
          <div className="absolute top-4 right-4 z-10">
            <button
              onClick={() => setSelectedPhoto(null)}
              className="w-11 h-11 rounded-full flex items-center justify-center"
              style={{ background: "rgba(0,0,0,0.5)" }}
            >
              <X size={18} color="white" />
            </button>
          </div>
          <img
            src={fullscreenPhoto.url}
            alt={fullscreenPhoto.caption}
            className="w-full h-full object-contain"
          />
          <div className="absolute bottom-0 left-0 right-0 p-5 pb-8" style={{ background: "linear-gradient(transparent, rgba(0,0,0,0.7))" }}>
            {fullscreenPhoto.caption && (
              <p className="text-white font-medium mb-1" style={{ fontSize: "15px" }}>{fullscreenPhoto.caption}</p>
            )}
            {fullscreenPhoto.location && (
              <div className="flex items-center gap-1">
                <MapPin size={12} color="rgba(255,255,255,0.6)" />
                <p className="text-white/60" style={{ fontSize: "13px" }}>{fullscreenPhoto.location}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
