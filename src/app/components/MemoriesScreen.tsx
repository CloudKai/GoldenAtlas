import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { Camera, ChevronLeft, ChevronRight, Heart, Play, Search, X } from "lucide-react";
import { useAppData } from "../contexts/AppDataContext";
import { allPhotos } from "../lib/selectors";
import { normalizeSearch } from "../data/countries";
import { onThisDay } from "../lib/trip-memories";
import { OnThisDayStrip } from "./OnThisDayStrip";

export function MemoriesScreen() {
  const { state, togglePhotoFavourite } = useAppData();
  const { photoId } = useParams();
  const navigate = useNavigate();
  const [country, setCountry] = useState("all");
  const [tripId, setTripId] = useState("all");
  const [favourites, setFavourites] = useState(false);
  const [query, setQuery] = useState("");
  const touchStart = useRef<number | null>(null);
  const needle = normalizeSearch(query);
  const photos = useMemo(() => state ? allPhotos(state).filter((photo) =>
    (country === "all" || photo.countryId === country) &&
    (tripId === "all" || photo.tripId === tripId) &&
    (!favourites || photo.isFavourite) &&
    (!needle || [photo.caption, photo.location ?? "", photo.tripTitle, photo.country].some((text) => normalizeSearch(text).includes(needle)))
  ) : [], [country, favourites, needle, state, tripId]);
  const filtersActive = country !== "all" || tripId !== "all" || favourites || Boolean(needle);
  const todaysMemories = useMemo(() => state ? onThisDay(state.trips) : [], [state]);
  const selectedIndex = photoId ? photos.findIndex((photo) => photo.id === photoId) : -1;
  const selected = selectedIndex >= 0 ? photos[selectedIndex] : null;
  const countries = useMemo(() => [...new Map((state?.trips ?? []).map((trip) => [trip.countryId, trip.country])).entries()], [state]);
  const slideshowHref = favourites ? "/app/slideshow?scope=favourites" : tripId !== "all" ? `/app/slideshow?scope=trip&id=${tripId}` : country !== "all" ? `/app/slideshow?scope=country&id=${country}` : "/app/slideshow?scope=all";
  const move = (delta: number) => {
    if (!selected || !photos.length) return;
    const next = photos[(selectedIndex + delta + photos.length) % photos.length];
    navigate(`/app/memories/${next.id}`, { replace: true });
  };

  useEffect(() => {
    if (!selected) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") move(1);
      if (event.key === "ArrowLeft") move(-1);
      if (event.key === "Escape") navigate("/app/memories");
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedIndex, photos.length]);

  if (selected) return <div className="relative flex h-full flex-col bg-black text-white" onTouchStart={(event) => { touchStart.current = event.touches[0].clientX; }} onTouchEnd={(event) => { if (touchStart.current == null) return; const distance = event.changedTouches[0].clientX - touchStart.current; if (Math.abs(distance) > 45) move(distance < 0 ? 1 : -1); touchStart.current = null; }}>
    <div className="absolute left-4 right-4 top-4 z-20 flex items-center justify-between"><button className="flex h-11 w-11 items-center justify-center rounded-full bg-black/50" onClick={() => navigate("/app/memories")} aria-label="Close photo"><X size={20}/></button><div className="flex gap-2"><button onClick={() => togglePhotoFavourite(selected.id)} className="flex h-11 w-11 items-center justify-center rounded-full bg-black/50" aria-label={selected.isFavourite ? "Remove photo from favourites" : "Add photo to favourites"}><Heart size={20} fill={selected.isFavourite ? "var(--gold)" : "none"} color={selected.isFavourite ? "var(--gold)" : "white"}/></button><button onClick={() => navigate(`/app/slideshow?scope=selection&photoIds=${selected.id}`)} className="flex h-11 w-11 items-center justify-center rounded-full bg-black/50" aria-label="Start slideshow from this photo"><Play size={19} fill="white"/></button></div></div>
    <img src={selected.url} alt={selected.caption || `Photo from ${selected.tripTitle}`} className="h-full w-full object-contain"/>
    {photos.length > 1 && <><button onClick={() => move(-1)} aria-label="Previous photo" className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/45"><ChevronLeft/></button><button onClick={() => move(1)} aria-label="Next photo" className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/45"><ChevronRight/></button></>}
    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-6 pt-16"><p className="font-semibold">{selected.caption || "Untitled memory"}</p><p className="mt-1 text-sm text-white/65">{selected.tripTitle} · {selected.country}</p><p className="mt-2 text-xs text-white/50">{selectedIndex + 1} of {photos.length}</p></div>
  </div>;

  return <div className="flex h-full flex-col bg-background">
    <header className="border-b px-5 pb-3 pt-4" style={{ borderColor: "var(--border)" }}><div className="flex items-end justify-between"><div><h1 className="text-2xl font-semibold tracking-tight">Memories</h1><p className="mt-0.5 text-xs" style={{ color: "var(--muted-foreground)" }}>{photos.length} {photos.length === 1 ? "photo" : "photos"} in your private gallery</p></div>{photos.length > 0 && <button onClick={() => navigate(slideshowHref)} className="flex h-11 items-center gap-2 rounded-xl px-4 text-sm font-semibold" style={{ background: "var(--gold)", color: "#1a1814" }}><Play size={16} fill="currentColor"/>Play</button>}</div>
      <div className="mt-3 flex gap-2 overflow-x-auto pb-1"><label className="sr-only" htmlFor="memory-country">Filter by country</label><select id="memory-country" value={country} onChange={(event) => { setCountry(event.target.value); setTripId("all"); }} className="h-11 min-w-[130px] rounded-xl border px-3 text-sm" style={{ background: "var(--card)", borderColor: "var(--border)" }}><option value="all">All countries</option>{countries.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select><label className="sr-only" htmlFor="memory-trip">Filter by trip</label><select id="memory-trip" value={tripId} onChange={(event) => setTripId(event.target.value)} className="h-11 min-w-[120px] rounded-xl border px-3 text-sm" style={{ background: "var(--card)", borderColor: "var(--border)" }}><option value="all">All trips</option>{(state?.trips ?? []).filter((trip) => country === "all" || trip.countryId === country).map((trip) => <option key={trip.id} value={trip.id}>{trip.title}</option>)}</select><button onClick={() => setFavourites(!favourites)} aria-pressed={favourites} className="flex h-11 min-w-11 items-center justify-center rounded-xl border px-3" style={{ borderColor: favourites ? "var(--gold)" : "var(--border)", color: favourites ? "var(--gold)" : "var(--muted-foreground)" }} aria-label="Show favourite photos only"><Heart size={17} fill={favourites ? "currentColor" : "none"}/></button></div>
      <div className="mt-2 flex items-center gap-2 rounded-xl border px-3" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
        <Search size={15} style={{ color: "var(--muted-foreground)" }} />
        <label className="sr-only" htmlFor="memory-search">Search captions and places</label>
        <input id="memory-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search captions, places, trips" className="h-11 min-w-0 flex-1 bg-transparent text-sm outline-none" />
        {query && <button type="button" onClick={() => setQuery("")} className="flex h-9 w-9 items-center justify-center" aria-label="Clear search"><X size={14} /></button>}
      </div>
    </header>
    <main className="flex-1 overflow-y-auto">{!filtersActive && <OnThisDayStrip entries={todaysMemories} />}{photos.length ? <div className="grid grid-cols-3 gap-0.5 p-0.5">{photos.map((photo) => <button key={photo.id} onClick={() => navigate(`/app/memories/${photo.id}`)} className="relative aspect-square overflow-hidden" aria-label={`Open ${photo.caption || "photo"} from ${photo.tripTitle}`}><img src={photo.thumbnailUrl || photo.url} alt="" className="h-full w-full object-cover"/>{photo.isFavourite && <span className="absolute right-1.5 top-1.5 rounded-full bg-black/55 p-1"><Heart size={12} fill="var(--gold)" color="var(--gold)"/></span>}</button>)}</div> : <div className="flex h-full flex-col items-center justify-center px-8 pb-16 text-center"><span className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl" style={{ background: "var(--gold-light)" }}><Camera size={28} color="var(--gold)"/></span><h2 className="text-lg font-semibold">{state?.trips.length ? "No photos match these filters" : "Your memories will live here"}</h2><p className="mt-2 text-sm leading-6" style={{ color: "var(--muted-foreground)" }}>{state?.trips.length ? "Change a filter or add photos to a trip." : "Create your first trip, then add JPEG or PNG photos to build your private gallery."}</p><button onClick={() => navigate("/app/add-trip")} className="mt-5 h-12 rounded-xl px-5 font-semibold" style={{ background: "var(--gold)", color: "#1a1814" }}>Add your first trip</button></div>}</main>
  </div>;
}
