import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { ChevronLeft, ChevronRight, Check, MapPin, Calendar, BookOpen, Camera, AlertCircle, Plus, X } from "lucide-react";
import { getCountry, searchCountries } from "../data/countries";
import { CITY_OPTIONS } from "../data/city-visits";
import { useAppData } from "../contexts/AppDataContext";
import { sanitizePhoto, type PhotoAsset } from "../lib/local-repository";
import { placePhotosInTrip, todayISO } from "../lib/trip-days";
import { CompanionsField, ExpenseField } from "./TripExtras";
import type { MemoryPhoto, Trip, TripExpense } from "../types/domain";

type Step = 1 | 2 | 3 | 4;

const MOODS = ["✨", "😊", "🌿", "🏮", "🌊", "🌸", "🍋", "🏔️", "🌅", "🗽", "💛", "🍷"];

const PROMPTS = [
  "What was your favourite moment?",
  "What surprised you most?",
  "What food did you enjoy?",
  "Would you return?",
  "What did you learn?",
];

export function AddTripScreen() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, saveTrip } = useAppData();
  const [step, setStep] = useState<Step>(1);
  // Opening "Add trip" from a country pre-selects it.
  const [countryId, setCountryId] = useState(() => getCountry(searchParams.get("country"))?.id ?? "");
  const [selectedCityIds, setSelectedCityIds] = useState<string[]>([]);
  const [customPlaces, setCustomPlaces] = useState<string[]>([]);
  const [companions, setCompanions] = useState<string[]>([]);
  const [expense, setExpense] = useState<TripExpense | undefined>(undefined);
  const [citySearch, setCitySearch] = useState("");
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [journal, setJournal] = useState("");
  const [mood, setMood] = useState("✨");
  const [rating, setRating] = useState(5);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");
  const [photos, setPhotos] = useState<MemoryPhoto[]>([]);
  const [photoAssets, setPhotoAssets] = useState<PhotoAsset[]>([]);
  const [photoStatus, setPhotoStatus] = useState("");
  const isDirty = Boolean(title || startDate || endDate || journal || photos.length || customPlaces.length || selectedCityIds.length || companions.length || expense);

  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => { if (isDirty) { event.preventDefault(); event.returnValue = ""; } };
    window.addEventListener("beforeunload", handler); return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  const leave = () => { if (!isDirty || window.confirm("Discard this unsaved trip?")) navigate(-1); };

  const countryList = searchCountries(countrySearch);

  const selectedCountry = getCountry(countryId) ?? null;
  const selectedCities = selectedCityIds.flatMap((id) => {
    const city = CITY_OPTIONS.find((option) => option.id === id);
    return city ? [city] : [];
  });
  const availableCities = CITY_OPTIONS.filter((city) => (
    city.countryId === countryId
    && !selectedCityIds.includes(city.id)
    && city.city.toLowerCase().includes(citySearch.trim().toLowerCase())
  ));

  const addCity = (id: string) => {
    setSelectedCityIds((current) => current.includes(id) ? current : [...current, id]);
    setCitySearch("");
  };

  // Any place can be added by name. Places outside the built-in list simply have no map pin.
  const addCustomPlace = (value: string) => {
    const name = value.trim().slice(0, 120);
    if (!name) return;
    const known = [...selectedCities.map((city) => city.city), ...customPlaces].some((existing) => existing.toLowerCase() === name.toLowerCase());
    if (!known) setCustomPlaces((current) => [...current, name]);
    setCitySearch("");
  };

  const validateStep1 = () => {
    const errs: string[] = [];
    if (!countryId) errs.push("Please select a country.");
    if (!title.trim()) errs.push("Please enter a trip name.");
    if (!startDate && !endDate) errs.push("Please enter when you travelled.");
    // One date is enough: a missing end date makes it a one-day trip, and a missing start date mirrors the end date.
    if (startDate && !endDate) setEndDate(startDate);
    if (endDate && !startDate) setStartDate(endDate);
    if (startDate && endDate && endDate < startDate) errs.push("End date can’t be before the start date.");
    setErrors(errs);
    return errs.length === 0;
  };

  const next = () => {
    if (step === 1 && !validateStep1()) return;
    if (step < 4) setStep((s) => (s + 1) as Step);
  };

  const save = async () => {
    setSaving(true);
    try {
      if (!selectedCountry) throw new Error("Select a country before saving.");
      const id = crypto.randomUUID();
      const trip: Trip = {
        id, countryId, title: title.trim(), city: [...selectedCities.map((city) => city.city), ...customPlaces].join(" & ") || selectedCountry.name,
        country: selectedCountry.name, countryFlag: selectedCountry.flag, startDate, endDate,
        duration: Math.max(1, Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000) + 1),
        coverImage: photos[0]?.url || "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=900&q=80&auto=format&fit=crop",
        photos: placePhotosInTrip(photos, startDate, endDate || startDate), days: [], journal: journal.trim(), mood, rating, companions, expense, places: [...selectedCities.map((city) => city.city), ...customPlaces],
        stops: selectedCities.map((city) => ({ id: `${id}-${city.id}`, cityId: city.id, city: city.city, countryId, region: city.region, latitude: city.latitude, longitude: city.longitude, arrivalDate: startDate, departureDate: endDate })),
        isFavourite: false,
      };
      const warnings = await saveTrip(trip, photoAssets);
      navigate(`/app/trip/${id}`, { replace: true, state: warnings.length ? { notice: warnings.join(" ") } : undefined });
    } catch (reason) { setErrors([reason instanceof Error ? reason.message : "Trip could not be saved."]); setStep(1); }
    finally { setSaving(false); }
  };

  const steps = [
    { label: "Where & when", icon: MapPin },
    { label: "Memories", icon: BookOpen },
    { label: "Photos", icon: Camera },
    { label: "Review", icon: Check },
  ];

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center gap-3 px-4 pt-4 pb-3 border-b" style={{ borderColor: "var(--border)" }}>
        <button
          onClick={() => step > 1 ? setStep((s) => (s - 1) as Step) : leave()}
          className="w-11 h-11 rounded-full flex items-center justify-center"
          style={{ background: "var(--muted)", color: "var(--foreground)" }}
          aria-label={step > 1 ? "Previous step" : "Back"}
        >
          <ChevronLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 style={{ fontSize: "18px", fontWeight: 600, color: "var(--foreground)" }}>Add trip</h1>
          <p style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>Step {step} of 4 — {steps[step - 1].label}</p>
        </div>
        <button
          onClick={leave}
          className="h-11 px-2"
          style={{ fontSize: "14px", color: "var(--muted-foreground)", fontWeight: 500 }}
        >
          Cancel
        </button>
      </div>

      {/* Step progress */}
      <div className="flex-shrink-0 flex gap-1.5 px-4 py-3">
        {steps.map((s, i) => (
          <div
            key={i}
            className="flex-1 h-1.5 rounded-full transition-all"
            style={{ background: i < step ? "var(--gold)" : i === step - 1 ? "var(--gold)" : "var(--muted)" }}
          />
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5">
        {/* Step 1: Where & when */}
        {step === 1 && (
          <div className="py-2">
            {errors.length > 0 && (
              <div className="flex items-start gap-2 p-3 rounded-xl mb-4" style={{ background: "rgba(192,57,43,0.08)", color: "#C0392B" }}>
                <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                <div className="flex flex-col gap-1">
                  {errors.map((e) => <span key={e} style={{ fontSize: "13px" }}>{e}</span>)}
                </div>
              </div>
            )}

            <div className="flex flex-col gap-4">
              {/* Country selector */}
              <div>
                <label className="block mb-1.5" style={{ fontSize: "13px", fontWeight: 500, color: "var(--muted-foreground)" }}>Country *</label>
                <button
                  onClick={() => setShowCountryPicker(true)}
                  className="w-full h-12 px-4 rounded-xl flex items-center gap-3"
                  style={{ background: "var(--input-background)", border: `1.5px solid ${countryId ? "var(--gold)" : "transparent"}` }}
                >
                  {selectedCountry ? (
                    <>
                      <span style={{ fontSize: "20px" }}>{selectedCountry.flag}</span>
                      <span style={{ fontSize: "15px", color: "var(--foreground)" }}>{selectedCountry.name}</span>
                    </>
                  ) : (
                    <span style={{ fontSize: "15px", color: "var(--muted-foreground)" }}>Select a country…</span>
                  )}
                  <ChevronRight size={16} className="ml-auto" style={{ color: "var(--muted-foreground)" }} />
                </button>
              </div>

              {/* Trip name */}
              <div>
                <label className="block mb-1.5" style={{ fontSize: "13px", fontWeight: 500, color: "var(--muted-foreground)" }}>Trip name *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Tokyo & Kyoto"
                  className="w-full h-12 px-4 rounded-xl outline-none"
                  style={{ background: "var(--input-background)", color: "var(--foreground)", border: "1.5px solid transparent", fontSize: "15px" }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "var(--gold)")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "transparent")}
                />
              </div>

              {/* Cities */}
              <div>
                <label className="block mb-1.5" style={{ fontSize: "13px", fontWeight: 500, color: "var(--muted-foreground)" }}>Cities or regions</label>
                {(selectedCities.length > 0 || customPlaces.length > 0) && (
                  <div className="mb-2 flex flex-wrap gap-2">
                    {customPlaces.map((place) => (
                      <span
                        key={`custom-${place}`}
                        className="flex items-center gap-1.5 rounded-full px-3 py-1.5"
                        style={{ background: "var(--gold-light)", color: "var(--foreground)", fontSize: "12px", fontWeight: 550 }}
                      >
                        <MapPin size={12} style={{ color: "var(--muted-foreground)" }} />
                        {place}
                        <button
                          type="button"
                          onClick={() => setCustomPlaces((current) => current.filter((item) => item !== place))}
                          className="ml-0.5 rounded-full p-0.5"
                          style={{ color: "var(--muted-foreground)" }}
                          aria-label={`Remove ${place}`}
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                    {selectedCities.map((city) => (
                      <span
                        key={city.id}
                        className="flex items-center gap-1.5 rounded-full px-3 py-1.5"
                        style={{ background: "var(--gold-light)", color: "var(--foreground)", fontSize: "12px", fontWeight: 550 }}
                      >
                        <MapPin size={12} style={{ color: "var(--gold)" }} />
                        {city.city}
                        <button
                          type="button"
                          onClick={() => setSelectedCityIds((current) => current.filter((id) => id !== city.id))}
                          className="ml-0.5 rounded-full p-0.5"
                          style={{ color: "var(--muted-foreground)" }}
                          aria-label={`Remove ${city.city}`}
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="relative">
                  <div
                    className="flex h-12 items-center gap-2 rounded-xl px-4"
                    style={{ background: "var(--input-background)", border: "1.5px solid transparent" }}
                  >
                    <Plus size={15} style={{ color: "var(--gold)" }} />
                    <input
                      type="text"
                      value={citySearch}
                      onChange={(event) => setCitySearch(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          if (availableCities[0]) addCity(availableCities[0].id);
                          else addCustomPlace(citySearch);
                        }
                      }}
                      disabled={!countryId}
                      placeholder={countryId ? "Add a city or place" : "Select a country first"}
                      className="min-w-0 flex-1 bg-transparent outline-none disabled:opacity-60"
                      style={{ color: "var(--foreground)", fontSize: "15px" }}
                      aria-label="Add a city or region"
                    />
                  </div>
                  {countryId && citySearch.trim() && (
                    <div className="absolute left-0 right-0 top-[52px] z-20 max-h-40 overflow-y-auto rounded-xl border shadow-lg" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
                      {availableCities.length > 0 ? availableCities.map((city) => (
                        <button
                          key={city.id}
                          type="button"
                          onClick={() => addCity(city.id)}
                          className="flex w-full items-center gap-3 border-b px-3 py-2.5 text-left last:border-b-0"
                          style={{ borderColor: "var(--border)" }}
                        >
                          <MapPin size={14} style={{ color: "var(--gold)" }} />
                          <span className="flex-1">
                            <span className="block" style={{ color: "var(--foreground)", fontSize: "13px", fontWeight: 550 }}>{city.city}</span>
                            {city.region && <span className="block" style={{ color: "var(--muted-foreground)", fontSize: "11px" }}>{city.region}</span>}
                          </span>
                          <Plus size={14} style={{ color: "var(--muted-foreground)" }} />
                        </button>
                      )) : null}
                      {citySearch.trim() && !availableCities.some((city) => city.city.toLowerCase() === citySearch.trim().toLowerCase()) && (
                        <button
                          type="button"
                          onClick={() => addCustomPlace(citySearch)}
                          className="flex w-full items-center gap-3 px-3 py-2.5 text-left"
                        >
                          <Plus size={14} style={{ color: "var(--gold)" }} />
                          <span style={{ color: "var(--foreground)", fontSize: "13px", fontWeight: 550 }}>Add “{citySearch.trim()}”</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <p className="mt-1.5" style={{ color: "var(--muted-foreground)", fontSize: "11px" }}>Optional. Type any city or place and press Enter. Places from our list also appear as pins on your map.</p>
              </div>

              {/* Dates */}
              <div className="flex gap-3">
                <div className="flex-1">
                  <label htmlFor="trip-start-date" className="block mb-1.5" style={{ fontSize: "13px", fontWeight: 500, color: "var(--muted-foreground)" }}>Start date *</label>
                  <input
                    id="trip-start-date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full h-12 px-3 rounded-xl outline-none"
                    style={{ background: "var(--input-background)", color: "var(--foreground)", border: "1.5px solid transparent", fontSize: "14px" }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "var(--gold)")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "transparent")}
                  />
                </div>
                <div className="flex-1">
                  <label htmlFor="trip-end-date" className="block mb-1.5" style={{ fontSize: "13px", fontWeight: 500, color: "var(--muted-foreground)" }}>End date</label>
                  <input
                    id="trip-end-date"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full h-12 px-3 rounded-xl outline-none"
                    style={{ background: "var(--input-background)", color: "var(--foreground)", border: "1.5px solid transparent", fontSize: "14px" }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "var(--gold)")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "transparent")}
                  />
                </div>
              </div>
              <p style={{ color: "var(--muted-foreground)", fontSize: "11px", lineHeight: 1.5 }}>
                {startDate && startDate > todayISO()
                  ? "This trip is ahead of you. It will appear under Upcoming, and the country turns gold on your map once the trip starts. You can plan each day after saving."
                  : "Planning ahead? Pick future dates. You can add a plan or diary for each day after saving, and add more days whenever the trip grows."}
              </p>
            </div>
          </div>
        )}

        {/* Step 2: Memories */}
        {step === 2 && (
          <div className="py-2">
            <p className="mb-4" style={{ fontSize: "14px", color: "var(--muted-foreground)" }}>
              Add your thoughts about this trip. Optional — but worth it.
            </p>

            {/* Writing prompts */}
            <div className="flex flex-wrap gap-2 mb-4">
              {PROMPTS.map((p) => (
                <button
                  key={p}
                  onClick={() => setJournal((j) => j + (j ? "\n\n" : "") + p + " ")}
                  className="px-3 py-1.5 rounded-full text-left transition-opacity active:opacity-70"
                  style={{ background: "var(--muted)", color: "var(--muted-foreground)", fontSize: "12px" }}
                >
                  {p}
                </button>
              ))}
            </div>

            <textarea
              value={journal}
              onChange={(e) => setJournal(e.target.value)}
              placeholder="Write about your journey…"
              className="w-full rounded-2xl p-4 outline-none resize-none"
              style={{
                background: "var(--input-background)",
                color: "var(--foreground)",
                fontSize: "15px",
                lineHeight: 1.6,
                minHeight: "140px",
                border: "1.5px solid transparent",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--gold)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "transparent")}
            />

            {/* Mood */}
            <div className="mt-5">
              <label className="block mb-2" style={{ fontSize: "13px", fontWeight: 500, color: "var(--muted-foreground)" }}>Mood</label>
              <div className="flex flex-wrap gap-2">
                {MOODS.map((m) => (
                  <button
                    key={m}
                    onClick={() => setMood(m)}
                    className="w-11 h-11 rounded-xl flex items-center justify-center text-xl transition-all"
                    style={{
                      background: mood === m ? "var(--gold-light)" : "var(--muted)",
                      border: `1.5px solid ${mood === m ? "var(--gold)" : "transparent"}`,
                    }}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* Rating */}
            <div className="mt-5">
              <label className="block mb-2" style={{ fontSize: "13px", fontWeight: 500, color: "var(--muted-foreground)" }}>Rating</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((r) => (
                  <button
                    key={r}
                    onClick={() => setRating(r)}
                    className="text-2xl transition-all"
                    style={{ opacity: r <= rating ? 1 : 0.3 }}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6 space-y-5">
              <CompanionsField value={companions} onChange={setCompanions} />
              <ExpenseField value={expense} onChange={setExpense} defaultCurrency={selectedCountry?.currency} planned={Boolean(startDate) && startDate > todayISO()} />
            </div>
          </div>
        )}

        {/* Step 3: Photos */}
        {step === 3 && (
          <div className="py-2">
            <p className="mb-1" style={{ fontSize: "16px", fontWeight: 600, color: "var(--foreground)" }}>Add photos</p>
            <p className="mb-5" style={{ fontSize: "14px", color: "var(--muted-foreground)" }}>
              Only photos you select will be accessed. GPS metadata is removed by default.
            </p>

            {/* Privacy note */}
            <div className="flex items-start gap-3 p-3 rounded-xl mb-5" style={{ background: "var(--gold-light)", border: "1px solid rgba(201,168,76,0.3)" }}>
              <MapPin size={16} style={{ color: "var(--gold)", marginTop: "2px", flexShrink: 0 }} />
              <div>
                <p style={{ fontSize: "13px", fontWeight: 600, color: "#7A6428" }}>Location removed by default</p>
                <p style={{ fontSize: "12px", color: "#A08944", marginTop: "2px", lineHeight: 1.4 }}>
                  Exact GPS coordinates are stripped from your photos before uploading. You can change this in Privacy settings.
                </p>
              </div>
            </div>

            {/* Upload area */}
            <label
              className="w-full cursor-pointer rounded-2xl border-2 border-dashed flex flex-col items-center justify-center py-8 transition-opacity active:opacity-70"
              style={{ borderColor: "var(--muted)", color: "var(--muted-foreground)" }}
            >
              <Camera size={28} className="mb-3" />
              <p style={{ fontSize: "15px", fontWeight: 500 }}>Choose photos</p>
              <p style={{ fontSize: "12px", marginTop: "4px" }}>Select from your library</p>
              <input className="sr-only" type="file" accept="image/*" multiple onChange={async (event) => { if (!user) return; setPhotoStatus("Processing photos and removing metadata…"); try { const processed = await Promise.all([...(event.target.files ?? [])].map((file) => sanitizePhoto(file, user.id))); setPhotos((current) => [...current, ...processed.map(({ photo }) => ({ ...photo, date: startDate }))]); setPhotoAssets((current) => [...current, ...processed.map(({ asset }) => asset)]); setPhotoStatus(`${processed.length} ${processed.length === 1 ? "photo is" : "photos are"} ready.`); } catch (reason) { setPhotoStatus(reason instanceof Error ? reason.message : "Photos could not be processed."); } event.target.value = ""; }}/>
            </label>

            {photoStatus && <p className="mt-3 text-center text-xs" role="status" style={{ color: "var(--muted-foreground)" }}>{photoStatus}</p>}
            {photos.length > 0 && <div className="mt-4 grid grid-cols-3 gap-1">{photos.map((photo) => <div key={photo.id} className="relative aspect-square overflow-hidden rounded-xl"><img src={photo.url} alt={photo.caption} className="h-full w-full object-cover"/><button onClick={() => { setPhotos((current) => current.filter((item) => item.id !== photo.id)); setPhotoAssets((current) => current.filter((item) => item.id !== photo.id)); }} className="absolute right-1 top-1 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white" aria-label={`Remove ${photo.caption}`}><X size={15}/></button></div>)}</div>}

            <p className="text-center mt-3" style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>
              You can also skip photos and add them later.
            </p>
          </div>
        )}

        {/* Step 4: Review */}
        {step === 4 && (
          <div className="py-2">
            <p className="mb-4" style={{ fontSize: "16px", fontWeight: 600, color: "var(--foreground)" }}>Review your trip</p>

            <div className="rounded-2xl overflow-hidden mb-4" style={{ background: "var(--card)" }}>
              {selectedCountry && (
                <div className="flex items-center gap-3 p-4 border-b" style={{ borderColor: "var(--border)" }}>
                  <span style={{ fontSize: "28px" }}>{selectedCountry.flag}</span>
                  <div>
                    <p style={{ fontSize: "16px", fontWeight: 600, color: "var(--foreground)" }}>{title || "Untitled trip"}</p>
                    <p style={{ fontSize: "13px", color: "var(--muted-foreground)" }}>
                      {selectedCities.length + customPlaces.length > 0 ? `${[...selectedCities.map((city) => city.city), ...customPlaces].join(" · ")}, ` : ""}{selectedCountry.name}
                    </p>
                  </div>
                </div>
              )}
              {startDate && endDate && (
                <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
                  <Calendar size={14} style={{ color: "var(--muted-foreground)" }} />
                  <span style={{ fontSize: "13px", color: "var(--foreground)" }}>{startDate} → {endDate}</span>
                </div>
              )}
              {journal && (
                <div className="px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
                  <p className="line-clamp-3" style={{ fontSize: "13px", color: "var(--muted-foreground)", lineHeight: 1.5 }}>{journal}</p>
                </div>
              )}
              <div className="flex items-center gap-4 px-4 py-3">
                <span style={{ fontSize: "20px" }}>{mood}</span>
                <div className="flex">
                  {[1,2,3,4,5].map((r) => (
                    <span key={r} style={{ fontSize: "14px", opacity: r <= rating ? 1 : 0.2 }}>★</span>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2 border-t px-4 py-3" style={{ borderColor: "var(--border)" }}><Camera size={14} style={{ color: "var(--muted-foreground)" }}/><span className="text-sm" style={{ color: "var(--muted-foreground)" }}>{photos.length} {photos.length === 1 ? "photo" : "photos"}</span></div>
            </div>

            <p className="mb-6" style={{ fontSize: "13px", color: "var(--muted-foreground)", lineHeight: 1.5 }}>
              This trip will be saved privately. Only you can see it.
            </p>
          </div>
        )}

        <div className="h-6" />
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 px-5 py-4 border-t" style={{ borderColor: "var(--border)" }}>
        {step < 4 ? (
          <div className="flex gap-3">
            {step > 1 && (
              <button
                onClick={() => setStep((s) => (s - 1) as Step)}
                className="h-13 px-5 rounded-2xl border flex items-center gap-1 font-medium"
                style={{ borderColor: "var(--border)", color: "var(--foreground)", fontSize: "15px", height: "52px" }}
              >
                <ChevronLeft size={16} />
                Back
              </button>
            )}
            <button
              onClick={next}
              className="flex-1 h-13 rounded-2xl flex items-center justify-center gap-2 font-semibold transition-opacity active:opacity-80"
              style={{ background: "var(--gold)", color: "#1A1814", fontSize: "15px", height: "52px" }}
            >
              Continue
              <ChevronRight size={16} />
            </button>
          </div>
        ) : (
          <button
            onClick={save}
            disabled={saving}
            className="w-full rounded-2xl flex items-center justify-center gap-2 font-semibold transition-opacity active:opacity-80 disabled:opacity-60"
            style={{ background: "var(--gold)", color: "#1A1814", fontSize: "15px", height: "52px" }}
          >
            {saving ? (
              <>
                <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Saving trip…
              </>
            ) : (
              <>
                <Check size={18} />
                Save trip
              </>
            )}
          </button>
        )}
      </div>

      {/* Country picker sheet */}
      {showCountryPicker && (
        <div className="absolute inset-0 z-50 flex flex-col" style={{ background: "var(--background)" }}>
          <div className="flex items-center gap-3 px-4 pt-5 pb-3">
            <button onClick={() => setShowCountryPicker(false)} className="w-11 h-11 rounded-full flex items-center justify-center" style={{ background: "var(--muted)" }} aria-label="Back to trip form">
              <ChevronLeft size={20} style={{ color: "var(--foreground)" }} />
            </button>
            <h2 style={{ fontSize: "18px", fontWeight: 600, color: "var(--foreground)" }}>Select country</h2>
          </div>
          <div className="px-4 mb-3">
            <input
              autoFocus
              type="text"
              value={countrySearch}
              onChange={(e) => setCountrySearch(e.target.value)}
              placeholder="Search countries and territories…"
              className="w-full h-11 px-4 rounded-xl outline-none"
              style={{ background: "var(--input-background)", color: "var(--foreground)", fontSize: "15px", border: "1.5px solid transparent" }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--gold)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "transparent")}
            />
          </div>
          <div className="flex-1 overflow-y-auto px-4">
            {countryList.length === 0 && <p className="py-6 text-center" style={{ color: "var(--muted-foreground)", fontSize: "14px" }}>No matching country or territory. Try another spelling.</p>}
            {countryList.map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  if (countryId !== c.id) { setSelectedCityIds([]); setCustomPlaces([]); }
                  setCountryId(c.id);
                  setCitySearch("");
                  setShowCountryPicker(false);
                  setCountrySearch("");
                }}
                className="w-full flex items-center gap-3 py-3.5 border-b transition-opacity active:opacity-70"
                style={{ borderColor: "var(--border)" }}
              >
                <span style={{ fontSize: "24px" }}>{c.flag}</span>
                <span style={{ fontSize: "15px", color: "var(--foreground)", flex: 1, textAlign: "left" }}>{c.name}{!c.countsTowardTotal && <span style={{ color: "var(--muted-foreground)", fontSize: "12px" }}> · territory or region</span>}</span>
                {countryId === c.id && <Check size={16} style={{ color: "var(--gold)" }} />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
