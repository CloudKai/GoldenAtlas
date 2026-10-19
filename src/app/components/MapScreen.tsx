import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { Search, Plus, List, ZoomIn, ZoomOut, RotateCcw, Info, X, MapPin, Camera, Calendar, ArrowRight, Bookmark, ChevronLeft } from "lucide-react";
import { WorldMap, type WorldMapHandle } from "./WorldMap";
import { WORLD_COUNTRY_OPTIONS } from "../data/world-map";
import { COUNTRIES, type CountryData } from "../data/mock-data";
import { getCityVisitSummaries, toCityMapMarkers } from "../data/city-visits";
import { useAppData } from "../contexts/AppDataContext";

const CONTINENT_BY_COUNTRY: Record<string, string> = {
  SG: "Asia", MY: "Asia", ID: "Asia", BN: "Asia", PH: "Asia",
  AU: "Oceania", NZ: "Oceania", PG: "Oceania",
};

function countryFlag(id: string) {
  if (!/^[A-Z]{2}$/.test(id)) return "🌍";
  return String.fromCodePoint(...id.split("").map((letter) => 127397 + letter.charCodeAt(0)));
}

export function MapScreen() {
  const navigate = useNavigate();
  const { user, state, toggleBucketList } = useAppData();
  const appTrips = state?.trips ?? [];
  const bucketListIds = state?.bucketListIds ?? [];
  const visitedIds = useMemo(() => [...new Set(appTrips.map((trip) => trip.countryId))], [appTrips]);
  const mapRef = useRef<WorldMapHandle>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedCityId, setSelectedCityId] = useState<string | null>(null);
  const [selectedName, setSelectedName] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showListView, setShowListView] = useState(false);

  const allCountries = useMemo<CountryData[]>(() => WORLD_COUNTRY_OPTIONS.map(({ id, name }) => {
    const countryTrips = appTrips.filter((trip) => trip.countryId === id);
    const dates = countryTrips.flatMap((trip) => [trip.startDate, trip.endDate]).sort();
    const fixture = COUNTRIES[id];
    const country = {
      id,
      name: fixture?.name ?? name,
      flag: fixture?.flag ?? countryFlag(id),
      continent: fixture?.continent ?? CONTINENT_BY_COUNTRY[id] ?? "World",
      visited: countryTrips.length > 0,
      bucketList: false,
      tripCount: countryTrips.length,
      photoCount: countryTrips.reduce((sum, trip) => sum + trip.photos.length, 0),
      firstVisit: dates[0],
      lastVisit: dates.at(-1),
    };

    return {
      ...country,
      bucketList: bucketListIds.includes(id),
    };
  }), [appTrips, bucketListIds]);
  const selectedCountry = selectedId
    ? (allCountries.find((country) => country.id === selectedId) ?? {
        id: selectedId,
        name: selectedName,
        flag: countryFlag(selectedId),
        continent: "World",
        visited: false,
        bucketList: false,
        tripCount: 0,
        photoCount: 0,
      })
    : null;
  const trips = selectedId ? appTrips.filter((trip) => trip.countryId === selectedId) : [];
  const citySummaries = useMemo(
    () => selectedId ? getCityVisitSummaries(appTrips, selectedId) : [],
    [appTrips, selectedId],
  );
  const cityMarkers = useMemo(() => toCityMapMarkers(citySummaries), [citySummaries]);
  const selectedCity = selectedCityId
    ? citySummaries.find((city) => city.id === selectedCityId) ?? null
    : null;
  const selectedCityTrips = selectedCity
    ? appTrips.filter((trip) => selectedCity.tripIds.includes(trip.id))
    : [];

  const visitedList = allCountries.filter((c) => c.visited);
  const bucketList = allCountries.filter((c) => c.bucketList);

  const filteredCountries = allCountries.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectCountry = (id: string, name?: string) => {
    setSelectedCityId(null);
    setSelectedId(id);
    setSelectedName(name ?? allCountries.find((country) => country.id === id)?.name ?? "");
  };

  const handleCountryClick = (id: string, name: string) => {
    selectCountry(id, name);
  };

  return (
    <div className="h-full flex flex-col relative bg-background overflow-hidden">
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between gap-2 px-3 py-2.5">
        <button
          onClick={() => navigate("/app/profile")}
          className="h-11 w-11 overflow-hidden rounded-2xl border-2 flex-shrink-0 shadow-md transition-transform active:scale-95"
          style={{ borderColor: "var(--gold)", background: "var(--card)" }}
          aria-label="Open profile and settings"
        >
          {user?.avatarUrl ? <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" /> : <span className="flex h-full w-full items-center justify-center text-sm font-bold" style={{ color: "var(--gold)" }}>{user?.name.split(/\s+/).map((part) => part[0]).join("").slice(0,2).toUpperCase()}</span>}
        </button>

        <div className="min-w-0 flex-1">
          {showSearch ? (
            <div className="flex h-11 items-center gap-2 rounded-2xl border px-3 shadow-md backdrop-blur-xl" style={{ background: "var(--map-legend-background)", borderColor: "var(--border)" }}>
              <Search size={15} style={{ color: "var(--muted-foreground)" }} />
              <input
                autoFocus
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search countries..."
                className="flex-1 bg-transparent outline-none"
                style={{ fontSize: "14px", color: "var(--foreground)" }}
              />
              <button onClick={() => { setShowSearch(false); setSearchQuery(""); }} className="flex h-11 w-11 items-center justify-center" aria-label="Close country search">
                <X size={15} style={{ color: "var(--muted-foreground)" }} />
              </button>
            </div>
          ) : (
            <div className="mx-auto flex h-11 max-w-[210px] items-center justify-center gap-3 rounded-2xl border px-4 shadow-md backdrop-blur-xl" style={{ background: "var(--map-legend-background)", borderColor: "var(--border)" }}>
              <div className="text-right leading-none">
                <span style={{ color: "var(--foreground)", fontSize: "17px", fontWeight: 700 }}>{visitedList.length}</span>
                <span style={{ color: "var(--muted-foreground)", fontSize: "12px", fontWeight: 600 }}> / 195</span>
              </div>
              <div className="h-6 w-px" style={{ background: "var(--border)" }} />
              <div>
                <p style={{ color: "var(--gold)", fontSize: "9px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" }}>Golden Atlas</p>
                <p className="whitespace-nowrap" style={{ color: "var(--foreground)", fontSize: "11px", fontWeight: 600 }}>Countries visited</p>
              </div>
            </div>
          )}
        </div>

        <button
          onClick={() => setShowSearch(true)}
          className="flex h-11 w-11 items-center justify-center rounded-2xl border shadow-md backdrop-blur-xl transition-transform active:scale-95"
          style={{ background: "var(--map-legend-background)", color: "var(--foreground)", borderColor: "var(--border)" }}
          aria-label="Search countries"
        >
          <Search size={16} />
        </button>
      </div>

      {/* List view overlay */}
      {showListView && (
        <div className="absolute inset-0 z-40 bg-background flex flex-col" style={{ paddingTop: "56px" }}>
          <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: "var(--border)" }}>
            <h2 style={{ fontSize: "18px", fontWeight: 600, color: "var(--foreground)" }}>Countries</h2>
            <button onClick={() => setShowListView(false)} style={{ color: "var(--muted-foreground)" }}>
              <X size={22} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {visitedList.length > 0 && (
              <div className="px-5 pt-4">
                <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--muted-foreground)" }}>Visited ({visitedList.length})</p>
                {visitedList.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => { setShowListView(false); selectCountry(c.id, c.name); }}
                    className="w-full flex items-center gap-3 py-3 border-b"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <span style={{ fontSize: "24px" }}>{c.flag}</span>
                    <div className="flex-1 text-left">
                      <p style={{ fontSize: "15px", fontWeight: 500, color: "var(--foreground)" }}>{c.name}</p>
                      <p style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>{c.tripCount} {c.tripCount === 1 ? "trip" : "trips"} · {c.photoCount} photos</p>
                    </div>
                    <ArrowRight size={16} style={{ color: "var(--muted-foreground)" }} />
                  </button>
                ))}
              </div>
            )}
            {bucketList.length > 0 && (
              <div className="px-5 pt-4 pb-6">
                <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--muted-foreground)" }}>Bucket list ({bucketList.length})</p>
                {bucketList.map((c) => (
                  <button key={c.id} onClick={() => { setShowListView(false); selectCountry(c.id, c.name); }} className="w-full flex items-center gap-3 py-3 border-b" style={{ borderColor: "var(--border)" }}>
                    <span style={{ fontSize: "24px" }}>{c.flag}</span>
                    <div className="flex-1 text-left">
                      <p style={{ fontSize: "15px", fontWeight: 500, color: "var(--foreground)" }}>{c.name}</p>
                      <p style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>Bucket list · {c.continent}</p>
                    </div>
                    <Bookmark size={16} style={{ color: "#8FB8AD" }} />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Search results */}
      {showSearch && searchQuery && (
        <div className="absolute top-14 left-4 right-4 z-30 rounded-2xl shadow-lg overflow-hidden" style={{ background: "var(--card)", maxHeight: "300px" }}>
          <div className="overflow-y-auto" style={{ maxHeight: "300px" }}>
            {filteredCountries.length === 0 ? (
              <div className="px-4 py-6 text-center" style={{ color: "var(--muted-foreground)", fontSize: "14px" }}>
                No countries found
              </div>
            ) : (
              filteredCountries.slice(0, 10).map((c) => (
                <button
                  key={c.id}
                  onClick={() => { selectCountry(c.id, c.name); setShowSearch(false); setSearchQuery(""); }}
                  className="w-full flex items-center gap-3 px-4 py-3 border-b transition-colors hover:opacity-80"
                  style={{ borderColor: "var(--border)" }}
                >
                  <span style={{ fontSize: "22px" }}>{c.flag}</span>
                  <div className="flex-1 text-left">
                    <p style={{ fontSize: "14px", fontWeight: 500, color: "var(--foreground)" }}>{c.name}</p>
                    <p style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>
                      {c.visited ? `Visited · ${c.tripCount} trips` : c.bucketList ? "Bucket list" : "Not visited"}
                    </p>
                  </div>
                  {c.visited && <div className="w-2 h-2 rounded-full" style={{ background: "var(--gold)" }} />}
                  {c.bucketList && <div className="w-2 h-2 rounded-full" style={{ background: "#8FB8AD" }} />}
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* Map */}
      <div className="flex-1 relative" style={{ marginTop: "60px" }}>
        <WorldMap
          ref={mapRef}
          visitedIds={visitedIds}
          bucketListIds={bucketListIds}
          selectedId={selectedId}
          cityMarkers={cityMarkers}
          selectedCityId={selectedCityId}
          onCountryClick={handleCountryClick}
          onCityClick={setSelectedCityId}
        />

        {/* Map legend */}
        <div className="absolute bottom-4 left-3 flex items-center gap-3 rounded-full border px-3 py-2 shadow-md" style={{ background: "var(--map-legend-background)", borderColor: "var(--border)", backdropFilter: "blur(14px)" }}>
          <div className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full" style={{ background: "var(--gold)", boxShadow: "0 0 0 3px color-mix(in srgb, var(--gold) 18%, transparent)" }} />
            <span style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>Visited</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full" style={{ background: "var(--map-bucket)" }} />
            <span style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>Bucket list</span>
          </div>
        </div>

        {/* Controls */}
        <div className="absolute bottom-4 right-3 flex flex-col gap-2">
          <div className="overflow-hidden rounded-2xl border shadow-md backdrop-blur-xl" style={{ background: "var(--map-legend-background)", borderColor: "var(--border)" }}>
            <button
              onClick={() => mapRef.current?.zoomIn()}
              className="flex h-11 w-11 items-center justify-center border-b"
              style={{ color: "var(--foreground)", borderColor: "var(--border)" }}
              aria-label="Zoom in"
            >
              <ZoomIn size={17} />
            </button>
            <button
              onClick={() => mapRef.current?.zoomOut()}
              className="flex h-11 w-11 items-center justify-center border-b"
              style={{ color: "var(--foreground)", borderColor: "var(--border)" }}
              aria-label="Zoom out"
            >
              <ZoomOut size={17} />
            </button>
            <button
              onClick={() => mapRef.current?.reset()}
              className="flex h-11 w-11 items-center justify-center"
              style={{ color: "var(--foreground)" }}
              aria-label="Show whole world"
            >
              <RotateCcw size={16} />
            </button>
          </div>
          <button
            onClick={() => setShowListView(true)}
            className="flex h-11 w-11 items-center justify-center rounded-2xl border shadow-md backdrop-blur-xl transition-transform active:scale-95"
            style={{ background: "var(--map-legend-background)", color: "var(--foreground)", borderColor: "var(--border)" }}
            aria-label="Open country list"
          >
            <List size={18} />
          </button>
          <button
            onClick={() => navigate("/app/add-trip")}
            className="flex h-11 w-11 items-center justify-center rounded-2xl shadow-md transition-transform active:scale-95"
            style={{ background: "var(--gold)", color: "#1A1814" }}
            aria-label="Add a trip"
          >
            <Plus size={20} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* Country preview sheet */}
      {selectedId && !selectedCity && (
        <div
          className="absolute bottom-0 left-0 right-0 z-30 rounded-t-3xl shadow-2xl"
          style={{ background: "var(--card)" }}
        >
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full" style={{ background: "var(--muted)" }} />
          </div>

          <div className="px-5 pt-2 pb-6">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <span style={{ fontSize: "36px" }}>{selectedCountry?.flag}</span>
                <div>
                  <h3 style={{ fontSize: "20px", fontWeight: 600, color: "var(--foreground)", letterSpacing: "-0.01em" }}>
                    {selectedCountry?.name}
                  </h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {selectedCountry?.visited ? (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: "var(--gold-light)", color: "#7A6428" }}>
                        ✓ Visited
                      </span>
                    ) : selectedCountry?.bucketList ? (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: "#E8F4F1", color: "#5A9A8C" }}>
                        ♡ Bucket list
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: "var(--muted)", color: "var(--muted-foreground)" }}>
                        Not visited
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button onClick={() => setSelectedId(null)} className="flex h-11 w-11 items-center justify-center" style={{ color: "var(--muted-foreground)" }} aria-label="Close country details">
                <X size={20} />
              </button>
            </div>

            {selectedCountry?.visited && (
              <>
                {/* Stats row */}
                <div className="flex flex-wrap gap-x-4 gap-y-2 mb-4">
                  {citySummaries.length > 0 && (
                    <div className="flex items-center gap-1.5">
                      <MapPin size={14} style={{ color: "var(--map-city-marker)" }} />
                      <span style={{ fontSize: "13px", color: "var(--foreground)", fontWeight: 500 }}>
                        {citySummaries.length} {citySummaries.length === 1 ? "city" : "cities"}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5">
                    <MapPin size={14} style={{ color: "var(--gold)" }} />
                    <span style={{ fontSize: "13px", color: "var(--foreground)", fontWeight: 500 }}>{selectedCountry.tripCount} trips</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Camera size={14} style={{ color: "var(--gold)" }} />
                    <span style={{ fontSize: "13px", color: "var(--foreground)", fontWeight: 500 }}>{selectedCountry.photoCount} photos</span>
                  </div>
                  {selectedCountry.lastVisit && (
                    <div className="flex items-center gap-1.5">
                      <Calendar size={14} style={{ color: "var(--gold)" }} />
                      <span style={{ fontSize: "13px", color: "var(--foreground)", fontWeight: 500 }}>
                        {new Date(selectedCountry.lastVisit).getFullYear()}
                      </span>
                    </div>
                  )}
                </div>

                {/* Trip preview */}
                {trips.length > 0 && (
                  <div className="flex gap-2 mb-4 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
                    {trips.slice(0, 3).map((trip) => (
                      <button
                        key={trip.id}
                        onClick={() => navigate(`/app/trip/${trip.id}`)}
                        className="flex-shrink-0 rounded-xl overflow-hidden relative"
                        style={{ width: "100px", height: "70px" }}
                      >
                        <img src={trip.coverImage} alt={trip.title} className="w-full h-full object-cover" />
                        <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.25)" }} />
                        <p className="absolute bottom-1.5 left-2 right-2 text-white text-left" style={{ fontSize: "10px", fontWeight: 500, lineHeight: 1.2 }}>
                          {trip.title.split(" ").slice(0, 2).join(" ")}
                        </p>
                      </button>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => navigate(`/app/country/${selectedId}`)}
                    className="flex-1 h-11 rounded-xl flex items-center justify-center gap-2 transition-opacity active:opacity-80"
                    style={{ background: "var(--gold)", color: "#1A1814", fontSize: "14px", fontWeight: 600 }}
                  >
                    View memories
                    <ArrowRight size={15} />
                  </button>
                  <button
                    onClick={() => navigate("/app/add-trip")}
                    className="h-11 px-4 rounded-xl flex items-center justify-center border transition-opacity active:opacity-80"
                    style={{ borderColor: "var(--border)", color: "var(--foreground)", fontSize: "14px", fontWeight: 500 }}
                    aria-label={`Add another trip to ${selectedCountry.name}`}
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </>
            )}

            {!selectedCountry?.visited && (
              <div className="flex gap-2">
                <button
                  onClick={() => navigate("/app/add-trip")}
                  className="flex-1 h-11 rounded-xl flex items-center justify-center gap-2 transition-opacity active:opacity-80"
                  style={{ background: "var(--gold)", color: "#1A1814", fontSize: "14px", fontWeight: 600 }}
                >
                  <Plus size={15} />
                  Add trip
                </button>
                <button
                    onClick={() => selectedId && toggleBucketList(selectedId)}
                  aria-pressed={selectedCountry?.bucketList}
                  aria-label={selectedCountry?.bucketList ? `Remove ${selectedCountry.name} from bucket list` : `Add ${selectedCountry?.name} to bucket list`}
                  className="flex-1 h-11 rounded-xl flex items-center justify-center gap-2 border transition-opacity active:opacity-80"
                  style={{
                    borderColor: selectedCountry?.bucketList ? "var(--map-bucket)" : "var(--border)",
                    color: selectedCountry?.bucketList ? "var(--map-bucket)" : "var(--foreground)",
                    fontSize: "14px",
                    fontWeight: 500,
                  }}
                >
                  <Bookmark size={15} fill={selectedCountry?.bucketList ? "currentColor" : "none"} />
                  {selectedCountry?.bucketList ? "Remove" : "Bucket list"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* City preview sheet */}
      {selectedId && selectedCity && (
        <div
          className="absolute bottom-0 left-0 right-0 z-30 rounded-t-3xl shadow-2xl"
          style={{ background: "var(--card)" }}
        >
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full" style={{ background: "var(--muted)" }} />
          </div>

          <div className="px-5 pt-2 pb-6">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedCityId(null)}
                  className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full"
                  style={{ background: "var(--muted)", color: "var(--foreground)" }}
                  aria-label={`Back to ${selectedCountry?.name}`}
                >
                  <ChevronLeft size={18} />
                </button>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate" style={{ fontSize: "20px", fontWeight: 650, color: "var(--foreground)", letterSpacing: "-0.01em" }}>
                      {selectedCity.city}
                    </h3>
                    {selectedCity.visitCount > 1 && (
                      <span className="flex-shrink-0 rounded-full px-2 py-0.5" style={{ background: "var(--gold-light)", color: "var(--gold-dark)", fontSize: "11px", fontWeight: 700 }}>
                        {selectedCity.visitCount} visits
                      </span>
                    )}
                  </div>
                  <p className="truncate" style={{ color: "var(--muted-foreground)", fontSize: "12px" }}>
                    {[selectedCity.region, selectedCountry?.name].filter(Boolean).join(", ")}
                  </p>
                </div>
              </div>
              <button type="button" onClick={() => setSelectedCityId(null)} className="flex h-11 w-11 items-center justify-center" style={{ color: "var(--muted-foreground)" }} aria-label="Close city details">
                <X size={20} />
              </button>
            </div>

            <div className="mb-4 flex flex-wrap gap-x-4 gap-y-2">
              <div className="flex items-center gap-1.5">
                <Calendar size={14} style={{ color: "var(--gold)" }} />
                <span style={{ fontSize: "13px", color: "var(--foreground)", fontWeight: 500 }}>
                  Last visited {new Date(selectedCity.lastVisited).getFullYear()}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <MapPin size={14} style={{ color: "var(--gold)" }} />
                <span style={{ fontSize: "13px", color: "var(--foreground)", fontWeight: 500 }}>
                  {selectedCityTrips.length} {selectedCityTrips.length === 1 ? "trip" : "trips"}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Camera size={14} style={{ color: "var(--gold)" }} />
                <span style={{ fontSize: "13px", color: "var(--foreground)", fontWeight: 500 }}>{selectedCity.photoCount} photos</span>
              </div>
            </div>

            {selectedCity.photos.length > 0 && (
              <div className="mb-4 flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
                {selectedCity.photos.slice(0, 4).map((photo) => (
                  <button
                    key={photo.id}
                    type="button"
                    onClick={() => navigate(`/app/memories/${photo.id}`)}
                    className="h-[66px] w-[82px] flex-shrink-0 overflow-hidden rounded-xl"
                    aria-label={`View ${photo.caption}`}
                  >
                    <img src={photo.url} alt={photo.caption} className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {selectedCityTrips.length > 0 && (
              <div className="mb-4 flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
                {selectedCityTrips.map((trip) => (
                  <button
                    key={trip.id}
                    type="button"
                    onClick={() => navigate(`/app/trip/${trip.id}`)}
                    className="flex-shrink-0 rounded-full border px-3 py-1.5"
                    style={{ borderColor: "var(--border)", color: "var(--foreground)", fontSize: "12px", fontWeight: 500 }}
                  >
                    {trip.title}
                  </button>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={() => navigate(`/app/country/${selectedId}`)}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl transition-opacity active:opacity-80"
              style={{ background: "var(--gold)", color: "#1A1814", fontSize: "14px", fontWeight: 650 }}
            >
              View memories
              <ArrowRight size={15} />
            </button>
          </div>
        </div>
      )}

      {/* First-time empty state hint */}
      {!selectedId && visitedList.length === 0 && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-4 py-2.5 rounded-full shadow-md" style={{ background: "var(--card)" }}>
          <Info size={14} style={{ color: "var(--gold)" }} />
          <span style={{ fontSize: "13px", color: "var(--foreground)", fontWeight: 500 }}>Tap a country to get started</span>
        </div>
      )}
    </div>
  );
}
