import test from "node:test";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import {
  COUNTRY_LIST, MAP_SHAPE_ALIASES, countsTowardWorldTotal, getCountry, resolveCountryId, searchCountries, shapeIdsForCountry,
} from "../src/app/data/countries";
import { allPhotos, deriveStatistics, photosForScope, togglePhotoFavourite, validateTrip } from "../src/app/lib/selectors";
import type { AppState, Trip } from "../src/app/types/domain";
import { migrateState } from "../src/app/lib/local-repository";
import { runPool, withRetry } from "../src/app/lib/async-pool";
import { applyEditDraft, clearAllDrafts, clearDraft, editDraftDiffers, loadDraft, newTripDraftHasContent, saveDraft, toEditDraft, type StorageLike } from "../src/app/lib/drafts";
import { clearFailedUploads, failedUploadsFor, stashFailedUploads } from "../src/app/lib/pending-uploads";
import { isUntouchedRow, mergePreferences, preferencesFromRow, readLocalPreferences, rowPatchFromPreferences, writeLocalPreferences } from "../src/app/lib/preferences-sync";
import { makeSnippet, searchTrips } from "../src/app/lib/trip-search";
import { onThisDay } from "../src/app/lib/trip-memories";
import { addCompanion, currencyOptions, expenseProblem, expenseTotals, formatMoney, parseAmount, setCoverPhoto } from "../src/app/lib/trip-extras";
import {
  addDays, addDayToTrip, canRemoveLastDay, datesInRange, dayFolders, daysUntil, hasStarted, movePhotoToDay, placePhotosInTrip, planDaySync,
  addPlaceToDay, removeLastDay, routeLabel, strandedDays, toggleDayPlace, tripStatus, updateDay, updatePhoto,
} from "../src/app/lib/trip-days";
import {
  applyMediaUrls, companionNames, describeAuthError, describeDatabaseError, describeFunctionError, flagEmoji, passwordProblem, placesToRows,
  planPhotoChanges, publishableKeyProblem, sortTrips, takenAtFromDate, tripDuration, tripFromRow, tripToRow, validateRemoteTrip,
  type MemoryRow, type PlaceRow, type TripRow,
} from "../src/app/lib/supabase-mappers";

const trip = (changes: Partial<Trip> = {}): Trip => ({
  id: "trip-1", countryId: "FR", title: "Paris", city: "Paris", country: "France", countryFlag: "🇫🇷",
  startDate: "2025-01-01", endDate: "2025-01-03", duration: 3, coverImage: "cover.jpg", journal: "",
  mood: "✨", rating: 5, companions: [], places: [], isFavourite: false,
  stops: [{ id: "stop-1", cityId: "fr-paris", city: "Paris", countryId: "FR", latitude: 48.8566, longitude: 2.3522 }],
  photos: [{ id: "photo-1", url: "photo.jpg", caption: "Seine", date: "2025-01-02", isFavourite: false }],
  ...changes,
});

const state = (trips: Trip[]): AppState => ({ schemaVersion: 1, userId: "user-1", trips, bucketListIds: [], updatedAt: "2025-01-03T00:00:00Z" });

test("statistics are derived from persisted trips without double-counting countries", () => {
  const value = deriveStatistics(state([trip(), trip({ id: "trip-2", title: "Provence", startDate: "2026-02-01", endDate: "2026-02-04", duration: 4, photos: [] })]), "2030-01-01");
  assert.equal(value.countriesVisited, 1);
  assert.equal(value.totalTrips, 2);
  assert.equal(value.totalTravelDays, 7);
  assert.equal(value.totalPhotos, 1);
  assert.equal(value.mostVisitedCountry, "France");
  assert.deepEqual(value.tripsByYear, [{ year: 2025, count: 1 }, { year: 2026, count: 1 }]);
});

test("slideshow scopes return only their requested memories", () => {
  const japan = trip({ id: "trip-jp", countryId: "JP", country: "Japan", title: "Japan", photos: [{ id: "photo-jp", url: "jp.jpg", caption: "Kyoto", date: "2026-01-01", isFavourite: true }] });
  const value = state([trip(), japan]);
  assert.deepEqual(photosForScope(value, { type: "country", countryId: "JP" }).map((photo) => photo.id), ["photo-jp"]);
  assert.deepEqual(photosForScope(value, { type: "favourites" }).map((photo) => photo.id), ["photo-jp"]);
  assert.equal(allPhotos(value).length, 2);
});

test("photo favourites persist through immutable trip updates", () => {
  const updated = togglePhotoFavourite([trip()], "photo-1");
  assert.equal(updated[0].photos[0].isFavourite, true);
  assert.equal(togglePhotoFavourite(updated, "photo-1")[0].photos[0].isFavourite, false);
});

test("trip validation catches dates and duplicate city stops", () => {
  assert.deepEqual(validateTrip(trip()), []);
  const invalid = trip({ title: "", startDate: "2025-02-03", endDate: "2025-02-01", stops: [trip().stops[0], { ...trip().stops[0], id: "duplicate" }] });
  assert.deepEqual(validateTrip(invalid), ["Enter a trip name.", "End date must be on or after the start date.", "Remove duplicate city stops."]);
});

test("repository migration supplies versioned defaults and removes duplicate bucket entries", () => {
  const migrated = migrateState({ trips: [], bucketListIds: ["JP", "JP", "NZ"] }, "user-2");
  assert.equal(migrated.schemaVersion, 1);
  assert.equal(migrated.userId, "user-2");
  assert.deepEqual(migrated.bucketListIds, ["JP", "NZ"]);
});

// ---------------------------------------------------------------------------
// Supabase mapping layer
// ---------------------------------------------------------------------------

const tripRow = (changes: Partial<TripRow> = {}): TripRow => ({
  id: "11111111-1111-4111-8111-111111111111", user_id: "u", country_code: "FR", name: "Paris", city: "Paris", region: null,
  start_date: "2025-01-01", end_date: "2025-01-03", journal: null, favourite_memory: null, mood: null, rating: null,
  expense_amount: null, expense_currency: null, is_favourite: false, created_at: "2025-01-01T00:00:00Z", updated_at: "2025-01-01T00:00:00Z", ...changes,
});
const memoryRow = (changes: Partial<MemoryRow> = {}): MemoryRow => ({
  id: "m1", user_id: "u", trip_id: "t", original_path: "u/t/m1/o.jpg", thumbnail_path: "u/t/m1/thumbnail.jpg", caption: null, location_label: null,
  taken_at: "2025-01-02T12:00:00+00:00", display_order: 0, is_favourite: false, original_mime_type: "image/jpeg", declared_size_bytes: 100,
  declared_thumbnail_size_bytes: 10, stored_size_bytes: 100, stored_thumbnail_size_bytes: 10, width: 10, height: 10, upload_status: "ready",
  created_at: "2025-01-01T00:00:00Z", updated_at: "2025-01-01T00:00:00Z", ...changes,
});
const placeRow = (changes: Partial<PlaceRow> = {}): PlaceRow => ({
  id: "p1", user_id: "u", trip_id: "t", name: "Paris", city: "Paris", country_code: "FR", latitude: 48.8566, longitude: 2.3522, notes: null,
  created_at: "2025-01-01T00:00:00Z", updated_at: "2025-01-01T00:00:00Z", ...changes,
});
const cities = [{ id: "fr-paris", city: "Paris", countryId: "FR", region: "Île-de-France", latitude: 48.8566, longitude: 2.3522 }];

test("database rows assemble into the domain trip with signed media, stops, and companions", () => {
  const result = tripFromRow(tripRow(), {
    countryName: () => "France",
    memories: [memoryRow({ id: "b", display_order: 1 }), memoryRow({ id: "a", display_order: 0, caption: "Seine" })],
    places: [placeRow(), placeRow({ id: "p2", name: "Louvre", city: null, latitude: null, longitude: null })],
    companions: ["Sam"],
    urls: new Map([["a", { url: "https://signed/a", thumbnailUrl: "https://signed/a-thumb" }]]),
    cities,
  });
  assert.equal(result.country, "France");
  assert.equal(result.countryFlag, "🇫🇷");
  assert.equal(result.duration, 3);
  assert.deepEqual(result.photos.map((photo) => photo.id), ["a", "b"]);
  assert.equal(result.photos[0].date, "2025-01-02");
  assert.equal(result.coverImage, "https://signed/a");
  assert.deepEqual(result.places, ["Paris", "Louvre"]);
  assert.equal(result.stops.length, 1);
  assert.deepEqual([result.stops[0].cityId, result.stops[0].region], ["fr-paris", "Île-de-France"]);
  assert.deepEqual(result.companions, ["Sam"]);
  assert.equal(result.mood, "✨");
  assert.equal(result.rating, 0);
});

test("a place outside the known city list becomes a stop with a stable derived id", () => {
  const result = tripFromRow(tripRow(), { countryName: () => "France", memories: [], places: [placeRow({ name: "Saint-Malo", city: "Saint-Malo", latitude: 48.6493, longitude: -2.0257 })], companions: [], urls: new Map(), cities });
  assert.equal(result.stops[0].cityId, "fr-saint-malo");
  assert.match(result.coverImage, /^https:\/\/images\.unsplash\.com\//);
});

test("saving a trip never sends identity, and stops and free-text places do not duplicate", () => {
  const value = trip({ rating: 0, mood: "🌿", places: ["Paris", "Louvre", "louvre", " "] });
  const row = tripToRow(value);
  assert.equal(row.rating, null);
  assert.equal("user_id" in row, false);
  const places = placesToRows(value);
  assert.deepEqual(places.map((place) => [place.name, place.latitude === null]), [["Paris", false], ["Louvre", true]]);
  assert.ok(places.every((place) => place.country_code === "FR"));
});

test("companion names are trimmed and de-duplicated case-insensitively", () => {
  assert.deepEqual(companionNames({ companions: [" Sam ", "sam", "", "Alex"] }), ["Sam", "Alex"]);
});

test("photo planning separates uploads, edits, and removals", () => {
  const photo = (id: string, changes: Record<string, unknown> = {}) => ({ id, url: "", caption: "", date: "2025-01-01", isFavourite: false, ...changes });
  const plan = planPhotoChanges([photo("keep"), photo("edit"), photo("gone")], [photo("keep"), photo("edit", { caption: "new" }), photo("fresh")], new Set(["fresh"]));
  assert.deepEqual(plan.toInsert.map((item) => item.photo.id), ["fresh"]);
  assert.deepEqual(plan.toUpdate.map((item) => item.photo.id), ["edit"]);
  assert.deepEqual(plan.toDelete, ["gone"]);
  const reordered = planPhotoChanges([photo("a"), photo("b")], [photo("b"), photo("a")], new Set());
  assert.deepEqual(reordered.toUpdate.map((item) => [item.photo.id, item.order]), [["b", 0], ["a", 1]]);
  assert.deepEqual(planPhotoChanges([], [photo("no-asset")], new Set()).toInsert, []);
});

test("refreshed signed URLs update only media fields", () => {
  const current = state([trip()]);
  const next = applyMediaUrls({ ...current, bucketListIds: ["JP"] }, new Map([["photo-1", { url: "https://new/o", thumbnailUrl: "https://new/t" }]]));
  assert.equal(next.trips[0].photos[0].url, "https://new/o");
  assert.equal(next.trips[0].photos[0].thumbnailUrl, "https://new/t");
  assert.equal(next.trips[0].coverImage, "https://new/o");
  assert.deepEqual(next.bucketListIds, ["JP"]);
  assert.equal(applyMediaUrls(current, new Map()), current);
});

test("date helpers match what the database stores", () => {
  assert.equal(tripDuration("2025-01-01", "2025-01-01"), 1);
  assert.equal(tripDuration("2025-02-27", "2025-03-02"), 4);
  assert.equal(takenAtFromDate("2025-03-04"), "2025-03-04T12:00:00Z");
  assert.equal(takenAtFromDate("not-a-date"), null);
  assert.equal(flagEmoji("jp"), "🇯🇵");
  assert.equal(flagEmoji("??"), "🌍");
  assert.deepEqual(sortTrips([trip({ id: "a", startDate: "2024-01-01" }), trip({ id: "b", startDate: "2026-01-01" })]).map((item) => item.id), ["b", "a"]);
});

test("remote validation mirrors the database length limits", () => {
  assert.deepEqual(validateRemoteTrip(trip()), []);
  const errors = validateRemoteTrip(trip({ title: "x".repeat(121), countryId: "france", photos: [{ id: "p", url: "", caption: "c".repeat(2001), date: "2025-01-01", isFavourite: false }] }));
  assert.equal(errors.length, 3);
});

test("error messages are friendly and never leak raw backend details", () => {
  assert.equal(describeAuthError({ code: "invalid_credentials" }), "Email or password is incorrect.");
  assert.match(describeAuthError({ code: "email_not_confirmed" }), /Confirm your email/);
  assert.match(describeAuthError({ status: 429 }), /Too many attempts/);
  assert.match(describeAuthError({ message: "TypeError: Failed to fetch" }), /connection/);
  assert.equal(describeAuthError({ code: "x", message: "SECRET internal detail" }).includes("SECRET"), false);
  assert.match(describeDatabaseError({ code: "23514", message: 'violates check constraint "trips_date_order"' }), /allowed range/);
  assert.equal(describeDatabaseError({ code: "XX000", message: "relation public.trips internal" }).includes("relation"), false);
  assert.match(describeFunctionError("AUTH_RECENT_REQUIRED"), /sign in again/);
  assert.match(describeFunctionError("NOT_A_CODE", "server text"), /Something went wrong/);
});

test("browser configuration rejects privileged keys and weak passwords", () => {
  const jwt = (role: string) => `x.${Buffer.from(JSON.stringify({ role })).toString("base64url")}.y`;
  assert.equal(publishableKeyProblem("sb_publishable_abc"), null);
  assert.equal(publishableKeyProblem(jwt("anon")), null);
  assert.match(publishableKeyProblem(jwt("service_role")) ?? "", /service-role/);
  assert.match(publishableKeyProblem("sb_secret_abc") ?? "", /secret key/);
  assert.match(publishableKeyProblem("replace-with-local-publishable-key") ?? "", /not configured/);
  assert.match(publishableKeyProblem(undefined) ?? "", /not configured/);
  assert.notEqual(passwordProblem("short1"), null);
  assert.notEqual(passwordProblem("onlyletterslong"), null);
  assert.notEqual(passwordProblem("1234567890123"), null);
  assert.equal(passwordProblem("a-long-pass-1"), null);
});

// ---------------------------------------------------------------------------
// Country coverage
// ---------------------------------------------------------------------------

const repoFile = (path: string) => readFileSync(path, "utf8");
const seedCodes = [...repoFile("supabase/seed.sql").matchAll(/^  \('([A-Z]{2})', '[A-Z]{3}',/gm)].map((match) => match[1]);
const atlas = JSON.parse(repoFile("ios/GoldenAtlas/GoldenAtlas/Resources/world-atlas.json")) as { countries: Array<{ id: string; name: string }> };

test("the web country list is exactly the database country list", () => {
  assert.equal(seedCodes.length, 250);
  assert.deepEqual(COUNTRY_LIST.map((country) => country.id).sort(), [...seedCodes].sort());
  assert.equal(COUNTRY_LIST.filter((country) => country.countsTowardTotal).length, 195);
  assert.ok(COUNTRY_LIST.every((country) => country.name.trim() === country.name && country.flag && country.continent));
});

test("every map shape resolves to a country the database can store", () => {
  assert.ok(atlas.countries.length > 200);
  const unresolved = atlas.countries.filter((shape) => !getCountry(shape.id)).map((shape) => shape.id);
  assert.deepEqual(unresolved, []);
  // Aliases only point at real countries, and every aliased shape really exists on the map.
  const shapeIds = new Set(atlas.countries.map((shape) => shape.id));
  Object.entries(MAP_SHAPE_ALIASES).forEach(([shape, target]) => {
    assert.ok(shapeIds.has(shape), `${shape} is not on the map`);
    assert.ok(getCountry(target), `${target} is not a country`);
  });
});

test("every country can be reached; only Antarctica has no tappable shape", () => {
  const shapeIds = new Set(atlas.countries.map((shape) => resolveCountryId(shape.id)));
  const withoutShape = COUNTRY_LIST.filter((country) => !shapeIds.has(country.id)).map((country) => country.id);
  assert.deepEqual(withoutShape, ["AQ"]);
  assert.equal(searchCountries("antarctica")[0]?.id, "AQ", "countries without a shape are still found by search");
  assert.deepEqual(shapeIdsForCountry("UM").sort(), ["UM", "UM-DQ", "UM-FQ", "UM-HQ", "UM-JQ", "UM-MQ", "UM-WQ"]);
  assert.equal(resolveCountryId("um-mq"), "UM");
  assert.equal(resolveCountryId("fr"), "FR");
});

test("country search is lenient about accents, case, and everyday names", () => {
  assert.equal(searchCountries("").length, 250);
  const first = (query: string) => searchCountries(query)[0]?.id;
  assert.equal(first("cote"), "CI");
  assert.equal(first("holland"), "NL");
  assert.equal(first("USA"), "US");
  assert.equal(first("burma"), "MM");
  assert.equal(first("czech republic"), "CZ");
  assert.equal(first("curaçao"), "CW");
  assert.equal(first("uni"), "AE", "names starting with the query rank first");
  assert.deepEqual(searchCountries("zzzz"), []);
});

test("territories are selectable but stay out of the 195 total", () => {
  assert.equal(countsTowardWorldTotal("FR"), true);
  assert.equal(countsTowardWorldTotal("HK"), false);
  assert.equal(countsTowardWorldTotal("XX"), false);
  const value = deriveStatistics(state([trip(), trip({ id: "hk", countryId: "HK", country: "Hong Kong" })]), "2030-01-01");
  assert.equal(value.countriesVisited, 2);
  assert.equal(value.worldCountriesVisited, 1);
});

// ---------------------------------------------------------------------------
// Planning ahead and day folders
// ---------------------------------------------------------------------------

const photoOn = (id: string, date: string, caption = "") => ({ id, url: `${id}.jpg`, caption, date, isFavourite: false });
const weekTrip = (changes: Partial<Trip> = {}): Trip => trip({ id: "week", startDate: "2030-03-30", endDate: "2030-04-02", duration: 4, photos: [], days: [], ...changes });

test("date helpers handle month ends, leap days, and bad input", () => {
  assert.equal(addDays("2028-02-28", 1), "2028-02-29");
  assert.equal(addDays("2030-03-31", 1), "2030-04-01");
  assert.equal(addDays("2030-01-01", -1), "2029-12-31");
  assert.deepEqual(datesInRange("2030-03-30", "2030-04-02"), ["2030-03-30", "2030-03-31", "2030-04-01", "2030-04-02"]);
  assert.deepEqual(datesInRange("2030-04-02", "2030-03-30"), []);
  assert.deepEqual(datesInRange("nope", "2030-03-30"), []);
  assert.equal(datesInRange("2000-01-01", "2100-01-01").length, 366, "a mistyped year cannot flood the screen");
});

test("a trip is upcoming, ongoing, or past relative to today", () => {
  const value = weekTrip();
  assert.equal(tripStatus(value, "2030-01-01"), "upcoming");
  assert.equal(tripStatus(value, "2030-03-30"), "ongoing");
  assert.equal(tripStatus(value, "2030-04-02"), "ongoing");
  assert.equal(tripStatus(value, "2030-04-03"), "past");
  assert.equal(hasStarted(value, "2030-03-29"), false);
  assert.equal(hasStarted(value, "2030-03-30"), true);
  assert.equal(daysUntil(value, "2030-03-25"), 5);
  assert.equal(daysUntil(value, "2031-01-01"), 0);
});

test("planned trips stay out of the numbers until they start", () => {
  const value = state([trip(), weekTrip({ countryId: "JP", country: "Japan", photos: [photoOn("p", "2030-03-30")] })]);
  const before = deriveStatistics(value, "2029-12-31");
  assert.deepEqual([before.totalTrips, before.upcomingTrips, before.countriesVisited, before.totalPhotos], [1, 1, 1, 2]);
  const after = deriveStatistics(value, "2030-03-30");
  assert.deepEqual([after.totalTrips, after.upcomingTrips, after.countriesVisited], [2, 0, 2]);
});

test("every date in a trip is a day folder and photos land in their day", () => {
  const value = weekTrip({ photos: [photoOn("a", "2030-03-31", "Harbour"), photoOn("b", "2030-03-31"), photoOn("c", "2030-04-02"), photoOn("stray", "2031-01-01")], days: [{ date: "2030-03-31", title: "Boats", notes: "Ferry at dawn" }] });
  const { days, otherPhotos, truncated } = dayFolders(value);
  assert.deepEqual(days.map((day) => [day.number, day.date, day.photos.length]), [[1, "2030-03-30", 0], [2, "2030-03-31", 2], [3, "2030-04-01", 0], [4, "2030-04-02", 1]]);
  assert.deepEqual([days[1].title, days[1].notes, days[0].notes], ["Boats", "Ferry at dawn", ""]);
  assert.deepEqual(otherPhotos.map((photo) => photo.id), ["stray"], "photos outside the dates are kept, never hidden");
  assert.equal(truncated, false);
});

test("writing on a day stores it and clearing it removes it", () => {
  let value = updateDay(weekTrip(), "2030-04-01", { notes: "Plan: museum" });
  value = updateDay(value, "2030-03-30", { title: "Arrival" });
  assert.deepEqual(value.days?.map((day) => day.date), ["2030-03-30", "2030-04-01"]);
  value = updateDay(value, "2030-04-01", { notes: "   " });
  assert.deepEqual(value.days?.map((day) => day.date), ["2030-03-30"]);
  value = updateDay(value, "2030-03-30", { title: "" });
  assert.deepEqual(value.days, []);
});

test("a trip can grow by a day, and only an empty last day can be removed", () => {
  const grown = addDayToTrip(weekTrip());
  assert.deepEqual([grown.endDate, grown.duration], ["2030-04-03", 5]);
  assert.equal(canRemoveLastDay(grown), true);
  assert.deepEqual([removeLastDay(grown).endDate, removeLastDay(grown).duration], ["2030-04-02", 4]);
  const withPhoto = { ...grown, photos: [photoOn("p", "2030-04-03")] };
  assert.equal(canRemoveLastDay(withPhoto), false);
  assert.equal(removeLastDay(withPhoto), withPhoto, "nothing saved on a day is ever deleted by removing it");
  const withNotes = updateDay(grown, "2030-04-03", { notes: "Flight home" });
  assert.equal(canRemoveLastDay(withNotes), false);
  const oneDay = weekTrip({ startDate: "2030-03-30", endDate: "2030-03-30", duration: 1 });
  assert.equal(canRemoveLastDay(oneDay), false, "a trip keeps at least one day");
});

test("captions and day moves change only the chosen photo", () => {
  const value = weekTrip({ photos: [photoOn("a", "2030-03-30"), photoOn("b", "2030-03-30")] });
  const captioned = updatePhoto(value, "a", { caption: "Sunrise" });
  assert.deepEqual(captioned.photos.map((photo) => photo.caption), ["Sunrise", ""]);
  const moved = movePhotoToDay(captioned, "b", "2030-04-02");
  assert.deepEqual(moved.photos.map((photo) => photo.date), ["2030-03-30", "2030-04-02"]);
  assert.equal(value.photos[0].caption, "", "the original trip is not mutated");
});

test("shortening a trip is blocked only when it would lose written days", () => {
  const written = weekTrip({ days: [{ date: "2030-04-02", notes: "Last day plans" }] });
  assert.deepEqual(strandedDays({ ...written, endDate: "2030-04-01" }), ["2030-04-02"]);
  assert.deepEqual(strandedDays(written), []);
  assert.match(validateTrip({ ...written, endDate: "2030-04-01" }).join(" "), /outside the new dates/);
  assert.deepEqual(validateTrip(weekTrip({ endDate: "2030-04-01" })), [], "empty days can always be dropped");
});

test("new uploads are placed inside the trip so they never vanish into a stray folder", () => {
  const placed = placePhotosInTrip([photoOn("today", "2026-10-19"), photoOn("inside", "2030-04-01")], "2030-03-30", "2030-04-02");
  assert.deepEqual(placed.map((photo) => photo.date), ["2030-03-30", "2030-04-01"]);
});

test("saving days writes only what changed", () => {
  const existing = [{ date: "d1", notes: "keep" }, { date: "d2", notes: "edit" }, { date: "d3", title: "gone", notes: "" }];
  const next = [{ date: "d1", notes: "keep" }, { date: "d2", notes: "edited" }, { date: "d4", notes: "new" }, { date: "d5", notes: "  " }];
  const plan = planDaySync(existing, next);
  assert.deepEqual(plan.toUpsert.map((day) => day.date), ["d2", "d4"]);
  assert.deepEqual(plan.toDelete, ["d3"]);
  assert.deepEqual(planDaySync(existing, existing.filter((day) => day.date !== "d3")), { toUpsert: [], toDelete: ["d3"] });
});

test("day diaries load from the database and respect its length limits", () => {
  const dayRow = (date: string, notes: string | null, title: string | null = null) => ({ id: date, user_id: "u", trip_id: "t", day_date: date, title, notes, places: [] as string[], created_at: "2030-01-01T00:00:00Z", updated_at: "2030-01-01T00:00:00Z" });
  const loaded = tripFromRow(tripRow(), { countryName: () => "France", memories: [], places: [], companions: [], urls: new Map(), cities, days: [dayRow("2025-01-02", "Second"), dayRow("2025-01-01", null, "First")] });
  assert.deepEqual(loaded.days, [{ date: "2025-01-01", title: "First", notes: "", places: [] }, { date: "2025-01-02", title: undefined, notes: "Second", places: [] }]);
  assert.equal(validateRemoteTrip(trip({ days: [{ date: "2025-01-01", title: "t".repeat(121), notes: "ok" }] })).length, 1);
  assert.equal(validateRemoteTrip(trip({ days: [{ date: "2025-01-01", notes: "n".repeat(20_001) }] })).length, 1);
  assert.deepEqual(validateRemoteTrip(trip({ days: [{ date: "2025-01-01", notes: "n".repeat(20_000) }] })), []);
});

test("trips saved before day folders existed load with an empty day list", () => {
  const migrated = migrateState({ trips: [{ ...trip(), days: undefined }, { ...trip({ id: "b" }), days: [{ date: "2025-01-01", notes: "kept" }] }] }, "user-3");
  assert.deepEqual(migrated.trips.map((item) => item.days), [[], [{ date: "2025-01-01", notes: "kept" }]]);
});

// ---------------------------------------------------------------------------
// Expenses, companions, and cover photo
// ---------------------------------------------------------------------------

test("typed amounts are read leniently and bad ones are rejected", () => {
  assert.equal(parseAmount("1,234.5"), 1234.5);
  assert.equal(parseAmount("$ 80"), 80);
  assert.equal(parseAmount("89.999"), 90);
  assert.equal(parseAmount(".5"), 0.5);
  assert.equal(parseAmount("0"), 0);
  for (const bad of ["", " ", ".", "abc", "-5", "1e5", "12.3.4", "99999999999"]) assert.equal(parseAmount(bad), undefined, `rejects ${JSON.stringify(bad)}`);
});

test("expenses are validated and totalled per currency", () => {
  assert.equal(expenseProblem(undefined), null);
  assert.equal(expenseProblem({ amount: 120.5, currency: "SGD" }), null);
  assert.match(expenseProblem({ amount: -1, currency: "SGD" }) ?? "", /between 0/);
  assert.match(expenseProblem({ amount: 5, currency: "sg" }) ?? "", /currency/);
  const totals = expenseTotals([{ expense: { amount: 100.1, currency: "SGD" } }, { expense: { amount: 0.2, currency: "SGD" } }, { expense: { amount: 50, currency: "JPY" } }, {}]);
  assert.deepEqual(totals, [{ currency: "SGD", amount: 100.3, trips: 2 }, { currency: "JPY", amount: 50, trips: 1 }]);
  assert.equal(formatMoney(1250, "USD").replace(/\s/g, ""), "$1,250");
  assert.equal(formatMoney(5, "N"), "N 5.00", "a malformed currency code never throws");
  assert.equal(currencyOptions(["SGD", "xx", undefined]).filter((code) => code === "SGD").length, 1);
  assert.ok(currencyOptions(["XOF"]).includes("XOF"));
});

test("every country has a usable default currency except Antarctica", () => {
  assert.equal(getCountry("SG")?.currency, "SGD");
  assert.equal(getCountry("JP")?.currency, "JPY");
  assert.equal(getCountry("AQ")?.currency, undefined);
  const invalid = COUNTRY_LIST.filter((country) => country.currency !== undefined && !/^[A-Z]{3}$/.test(country.currency));
  assert.deepEqual(invalid, []);
});

test("expenses round-trip through the database mapping", () => {
  const withExpense = trip({ expense: { amount: 89.9, currency: "EUR" } });
  assert.deepEqual([tripToRow(withExpense).expense_amount, tripToRow(withExpense).expense_currency], [89.9, "EUR"]);
  assert.deepEqual([tripToRow(trip()).expense_amount, tripToRow(trip()).expense_currency], [null, null], "clearing an expense clears both columns");
  const loaded = tripFromRow(tripRow({ expense_amount: 89.9, expense_currency: "EUR" }), { countryName: () => "France", memories: [], places: [], companions: [], urls: new Map(), cities });
  assert.deepEqual(loaded.expense, { amount: 89.9, currency: "EUR" });
  assert.equal(tripFromRow(tripRow(), { countryName: () => "France", memories: [], places: [], companions: [], urls: new Map(), cities }).expense, undefined);
  assert.match(validateTrip({ ...trip(), expense: { amount: -3, currency: "EUR" } }).join(" "), /between 0/);
  assert.equal(validateRemoteTrip(trip({ expense: { amount: 5, currency: "bad" } })).length, 1);
});

test("companions are added cleanly and the cover moves to the front", () => {
  assert.deepEqual(addCompanion(["Sam"], "  alex   kim "), ["Sam", "alex kim"]);
  assert.deepEqual(addCompanion(["Sam"], "SAM"), ["Sam"]);
  assert.deepEqual(addCompanion(["Sam"], "   "), ["Sam"]);
  const value = weekTrip({ photos: [photoOn("a", "2030-03-30"), photoOn("b", "2030-03-31"), photoOn("c", "2030-04-01")] });
  assert.deepEqual(setCoverPhoto(value, "c").photos.map((photo) => photo.id), ["c", "a", "b"]);
  assert.equal(setCoverPhoto(value, "a"), value, "choosing the current cover changes nothing");
  assert.equal(setCoverPhoto(value, "missing"), value);
});

// ---------------------------------------------------------------------------
// Search, on this day, and day places
// ---------------------------------------------------------------------------

const kyoto = weekTrip({
  id: "kyoto", title: "Spring in Japan", city: "Kyoto", country: "Japan", countryId: "JP", startDate: "2024-04-01", endDate: "2024-04-05", duration: 5,
  places: ["Fushimi Inari", "Gion"], companions: ["Aiko Tanaka"], journal: "We walked the Philosopher's Path under the cherry blossoms.",
  days: [{ date: "2024-04-02", title: "Temples", notes: "Quiet morning at Kiyomizu-dera, then matcha in Gion.", places: ["Kiyomizu-dera", "Gion"] }],
  photos: [photoOn("p1", "2024-04-02", "Lanterns at dusk"), { ...photoOn("p2", "2024-04-03", ""), location: "Arashiyama bamboo grove" }],
});
const lisbon = weekTrip({ id: "lisbon", title: "Lisbon weekend", city: "Lisbon", country: "Portugal", countryId: "PT", startDate: "2025-04-02", endDate: "2025-04-03", duration: 2, places: ["Alfama"], photos: [photoOn("p3", "2025-04-02", "Tram 28")], days: [] });

test("search finds words in diaries, captions, places, and companions, in any order", () => {
  const ids = (query: string) => searchTrips([kyoto, lisbon], query).map((result) => result.trip.id);
  assert.deepEqual(ids("kiyomizu"), ["kyoto"], "day diary");
  assert.deepEqual(ids("lanterns"), ["kyoto"], "photo caption");
  assert.deepEqual(ids("bamboo"), ["kyoto"], "photo location");
  assert.deepEqual(ids("aiko"), ["kyoto"], "companion");
  assert.deepEqual(ids("PHILOSOPHER"), ["kyoto"], "journal, case-insensitive");
  assert.deepEqual(ids("gion temple"), ["kyoto"], "words may match in different places");
  assert.deepEqual(ids("alfama tram"), ["lisbon"]);
  assert.deepEqual(ids("tram bamboo"), [], "every word must be on the same trip");
  assert.deepEqual(ids("zzz"), []);
  assert.deepEqual(ids("  "), ["kyoto", "lisbon"], "an empty search keeps every trip");
});

test("name matches rank first and snippets show where the words were found", () => {
  const ranked = searchTrips([lisbon, kyoto], "japan").map((result) => result.trip.id);
  assert.deepEqual(ranked, ["kyoto"]);
  const [result] = searchTrips([kyoto], "matcha");
  assert.equal(result.matches[0].field, "day");
  assert.match(result.matches[0].label, /diary/);
  assert.match(result.matches[0].snippet, /matcha in Gion/);
  assert.equal(searchTrips([kyoto], "spring")[0].matches.length, 0, "name matches are already visible on the card");
  assert.equal(makeSnippet("Café au lait", "cafe"), "Café au lait", "accents never block a match");
  const long = `${"a ".repeat(60)}needle${" b".repeat(60)}`;
  assert.match(makeSnippet(long, "needle") ?? "", /^….*needle.*…$/);
});

test("on this day gathers earlier years with photos or a diary on today's date", () => {
  const entries = onThisDay([kyoto, lisbon], "2026-04-02");
  assert.deepEqual(entries.map((entry) => [entry.year, entry.trip.id, entry.photos.length, entry.day?.title ?? null]), [[2025, "lisbon", 1, null], [2024, "kyoto", 1, "Temples"]]);
  assert.deepEqual(onThisDay([kyoto, lisbon], "2026-04-04"), [], "a day inside the trip with nothing recorded is skipped");
  assert.deepEqual(onThisDay([kyoto, lisbon], "2025-04-02").map((entry) => entry.trip.id), ["kyoto"], "the current year never counts");
  assert.deepEqual(onThisDay([weekTrip({ photos: [photoOn("f", "2030-03-30")] })], "2031-03-30").length, 1);
  assert.deepEqual(onThisDay([weekTrip({ photos: [photoOn("f", "2030-03-30")] })], "2029-03-30"), [], "planned trips are not memories yet");
  const leap = weekTrip({ startDate: "2024-02-29", endDate: "2024-02-29", photos: [photoOn("l", "2024-02-29")] });
  assert.equal(onThisDay([leap], "2026-02-28").length, 0);
  assert.equal(onThisDay([leap], "2028-02-29").length, 1);
});

test("slideshows can play one day or today's memories", () => {
  const value = state([kyoto, lisbon]);
  assert.deepEqual(photosForScope(value, { type: "day", tripId: "kyoto", date: "2024-04-02" }).map((photo) => photo.id), ["p1"]);
  assert.deepEqual(photosForScope(value, { type: "day", tripId: "kyoto", date: "2024-04-04" }), []);
});

test("places are tapped onto a day in the order visited, and new ones join the trip", () => {
  let value = weekTrip({ places: ["Gion", "Nishiki Market"] });
  value = toggleDayPlace(value, "2030-03-31", "Nishiki Market");
  value = toggleDayPlace(value, "2030-03-31", "gion");
  assert.deepEqual(value.days?.[0].places, ["Nishiki Market", "Gion"]);
  assert.equal(routeLabel(value.days![0].places!), "Nishiki Market → Gion");
  value = toggleDayPlace(value, "2030-03-31", "NISHIKI MARKET");
  assert.deepEqual(value.days?.[0].places, ["Gion"], "tapping again removes it");
  value = toggleDayPlace(value, "2030-03-31", "Gion");
  assert.deepEqual(value.days, [], "a day with nothing left disappears");
  value = addPlaceToDay(value, "2030-04-01", "  Philosopher's   Path ");
  assert.deepEqual(value.places, ["Gion", "Nishiki Market", "Philosopher's Path"]);
  assert.deepEqual(value.days?.[0].places, ["Philosopher's Path"]);
  assert.equal(addPlaceToDay(value, "2030-04-01", "philosopher's path"), value, "adding the same place twice changes nothing");
  assert.deepEqual(addPlaceToDay(value, "2030-04-02", "gion").places, value.places, "an existing trip place is reused, not duplicated");
  assert.deepEqual(planDaySync([], [{ date: "2030-04-01", notes: "", places: ["A"] }]).toUpsert.length, 1, "a day with only places is saved");
  assert.equal(planDaySync([{ date: "d", notes: "", places: ["A"] }], [{ date: "d", notes: "", places: ["A"] }]).toUpsert.length, 0);
});

// ---------------------------------------------------------------------------
// Reliability: uploads, drafts, and synced settings
// ---------------------------------------------------------------------------

const memoryStorage = (): StorageLike & { data: Map<string, string> } => {
  const data = new Map<string, string>();
  return { data, getItem: (key) => data.get(key) ?? null, setItem: (key, value) => { data.set(key, value); }, removeItem: (key) => { data.delete(key); } };
};

test("a pool never runs more than its limit at once, keeps order, and isolates failures", async () => {
  let running = 0;
  let peak = 0;
  const results = await runPool([1, 2, 3, 4, 5, 6, 7], 3, async (item) => {
    running += 1; peak = Math.max(peak, running);
    await new Promise((resolve) => setTimeout(resolve, 5));
    running -= 1;
    if (item === 4) throw new Error("boom");
    return item * 10;
  });
  assert.equal(peak, 3);
  assert.deepEqual(results.map((result) => result.ok ? result.value : "failed"), [10, 20, 30, "failed", 50, 60, 70]);
  assert.deepEqual(await runPool([], 3, async () => 1), []);
  assert.equal((await runPool([1], 99, async (item) => item))[0].ok, true);
});

test("retries back off, stop for permanent errors, and give up after the last attempt", async () => {
  const waits: number[] = [];
  const sleep = async (ms: number) => { waits.push(ms); };
  let calls = 0;
  const value = await withRetry(async () => { calls += 1; if (calls < 3) throw new Error("flaky"); return "ok"; }, { attempts: 3, delayMs: 100, sleep });
  assert.deepEqual([value, calls, waits], ["ok", 3, [100, 200]]);

  calls = 0;
  await assert.rejects(withRetry(async () => { calls += 1; throw new Error("down"); }, { attempts: 3, delayMs: 1, sleep }), /down/);
  assert.equal(calls, 3);

  calls = 0;
  await assert.rejects(withRetry(async () => { calls += 1; throw new Error("denied"); }, { attempts: 5, sleep, shouldRetry: () => false }), /denied/);
  assert.equal(calls, 1, "permanent errors are not retried");
});

test("failed uploads are remembered per trip until they succeed", () => {
  const upload = (id: string) => ({ photo: photoOn(id, "2030-03-30"), asset: { id, userId: "u", original: new Blob(["x"]), thumbnail: new Blob(["y"]) } });
  stashFailedUploads("trip-a", [upload("p1"), upload("p2")]);
  stashFailedUploads("trip-b", [upload("p3")]);
  assert.deepEqual(failedUploadsFor("trip-a").map((item) => item.photo.id), ["p1", "p2"]);
  stashFailedUploads("trip-a", [upload("p2")]);
  assert.equal(failedUploadsFor("trip-a").length, 2, "retrying the same photo does not duplicate it");
  clearFailedUploads("trip-a", ["p1"]);
  assert.deepEqual(failedUploadsFor("trip-a").map((item) => item.photo.id), ["p2"]);
  clearFailedUploads("trip-a");
  assert.deepEqual(failedUploadsFor("trip-a"), []);
  assert.equal(failedUploadsFor("trip-b").length, 1, "other trips are untouched");
  clearFailedUploads("trip-b");
});

test("drafts survive reloads but expire, tolerate corruption, and respect size", () => {
  const storage = memoryStorage();
  const start = new Date("2030-01-01T10:00:00Z");
  assert.equal(saveDraft("k", { title: "Lisbon" }, storage, start), true);
  assert.deepEqual(loadDraft("k", storage, new Date("2030-01-02T10:00:00Z"))?.data, { title: "Lisbon" });
  assert.equal(loadDraft("k", storage, new Date("2030-03-01T10:00:00Z")), null, "old drafts expire");
  assert.equal(storage.data.size, 0, "an expired draft is removed");

  storage.setItem("golden-atlas:draft:bad", "{not json");
  assert.equal(loadDraft("bad", storage), null);
  assert.equal(storage.data.has("golden-atlas:draft:bad"), false, "a corrupt draft is removed");
  storage.setItem("golden-atlas:draft:old", JSON.stringify({ version: 99, savedAt: start.toISOString(), data: {} }));
  assert.equal(loadDraft("old", storage, start), null, "an unknown format is ignored");

  assert.equal(saveDraft("big", { text: "x".repeat(300_000) }, storage), false, "oversized drafts are refused");
  assert.equal(saveDraft("k", { a: 1 }, null), false, "no storage means no draft, never an error");
  const full: StorageLike = { getItem: () => null, removeItem: () => {}, setItem: () => { throw new Error("quota"); } };
  assert.equal(saveDraft("k", { a: 1 }, full), false, "a full disk never throws");
  saveDraft("gone", { a: 1 }, storage);
  clearDraft("gone", storage);
  assert.equal(loadDraft("gone", storage), null);
});

test("signing out removes every draft but nothing else", () => {
  const data = new Map<string, string>([["golden-atlas:theme", "dark"]]);
  const storage = { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => { data.set(k, v); }, removeItem: (k: string) => { data.delete(k); }, key: (i: number) => [...data.keys()][i] ?? null, get length() { return data.size; } };
  saveDraft("add-trip:u1", { a: 1 }, storage);
  saveDraft("trip-edit:u1:t1", { a: 2 }, storage);
  saveDraft("add-trip:u2", { a: 3 }, storage);
  clearAllDrafts(storage);
  assert.deepEqual([...data.keys()], ["golden-atlas:theme"]);
  assert.doesNotThrow(() => clearAllDrafts(null));
  assert.doesNotThrow(() => clearAllDrafts(memoryStorage()), "storage that cannot be listed is left alone");
});

test("trip edits are restored onto the saved trip, captions included", () => {
  const saved = weekTrip({ days: [], photos: [photoOn("a", "2030-03-30", "old"), photoOn("b", "2030-03-31", "keep")] });
  assert.equal(editDraftDiffers(saved, toEditDraft(saved)), false, "nothing changed, nothing to save");
  const edited = updatePhoto(updateDay({ ...saved, title: "Renamed", journal: "Written offline" }, "2030-03-31", { notes: "Offline diary" }), "a", { caption: "new caption" });
  const draft = toEditDraft(edited);
  assert.equal(editDraftDiffers(saved, draft), true);
  const restored = applyEditDraft(saved, draft);
  assert.deepEqual([restored.title, restored.journal, restored.days?.[0].notes], ["Renamed", "Written offline", "Offline diary"]);
  assert.deepEqual(restored.photos.map((photo) => photo.caption), ["new caption", "keep"]);
  assert.deepEqual(restored.photos.map((photo) => photo.url), saved.photos.map((photo) => photo.url), "photos themselves are never replaced");
  const withoutPhoto = applyEditDraft({ ...saved, photos: [saved.photos[1]] }, draft);
  assert.deepEqual(withoutPhoto.photos.map((photo) => photo.id), ["b"], "captions for photos that no longer exist are ignored");
  const blank = { countryId: "", title: " ", startDate: "", endDate: "", journal: "", mood: "✨", rating: 5, selectedCityIds: [], customPlaces: [], companions: [] };
  assert.equal(newTripDraftHasContent(blank), false);
  assert.equal(newTripDraftHasContent({ ...blank, companions: ["Sam"] }), true);
});

test("settings map to and from the account without losing meaning", () => {
  const row = { theme: "dark", reduced_motion: true, remove_photo_gps_by_default: false, analytics_consent: true, slideshow_duration_seconds: 8, slideshow_transition: "dissolve", slideshow_order: "reverse_chronological" };
  const prefs = preferencesFromRow(row);
  assert.deepEqual(prefs, { theme: "dark", reducedMotion: true, removeLocation: false, analytics: true, slideshow: { duration: 8, transition: "Dissolve", order: "Newest first" } });
  assert.deepEqual(rowPatchFromPreferences(prefs), { theme: "dark", reduced_motion: true, remove_photo_gps_by_default: false, analytics_consent: true, slideshow_duration_seconds: 8, slideshow_transition: "dissolve", slideshow_order: "reverse_chronological" });
  assert.deepEqual(rowPatchFromPreferences({ theme: "light" }), { theme: "light" }, "only changed settings are written");
  assert.deepEqual(rowPatchFromPreferences({ slideshow: { duration: 99 } }), { slideshow_duration_seconds: 30 }, "durations are kept inside the database range");
  assert.deepEqual(rowPatchFromPreferences({ slideshow: { order: "Shuffle", transition: "None" } }), { slideshow_order: "random", slideshow_transition: "none" });
  assert.equal(preferencesFromRow({ ...row, slideshow_transition: "slide", theme: "weird", slideshow_order: "???" }).slideshow.transition, "Fade", "the native app's slide shows as the closest web transition");
  assert.equal(preferencesFromRow({ ...row, theme: "weird" }).theme, "system");
  assert.equal(isUntouchedRow({ created_at: "2030-01-01T00:00:00.100Z", updated_at: "2030-01-01T00:00:00.400Z" }), true);
  assert.equal(isUntouchedRow({ created_at: "2030-01-01T00:00:00Z", updated_at: "2030-02-01T00:00:00Z" }), false);
  assert.deepEqual(mergePreferences(prefs, { slideshow: { duration: 3 } }).slideshow, { duration: 3, transition: "Dissolve", order: "Newest first" });
});

test("this device's settings can be read and written back", () => {
  const storage = memoryStorage();
  assert.deepEqual(readLocalPreferences(storage), { theme: "system", reducedMotion: false, removeLocation: true, analytics: false, slideshow: { duration: 5, transition: "Fade", order: "Chronological" } }, "private by default");
  writeLocalPreferences({ theme: "dark", reducedMotion: true, removeLocation: false, analytics: true, slideshow: { duration: 12, transition: "None", order: "Shuffle" } }, storage);
  assert.deepEqual(readLocalPreferences(storage), { theme: "dark", reducedMotion: true, removeLocation: false, analytics: true, slideshow: { duration: 12, transition: "None", order: "Shuffle" } });
  storage.setItem("golden-atlas:slideshow", "{broken");
  assert.equal(readLocalPreferences(storage).slideshow.duration, 5, "a damaged setting falls back to the default");
});

test("original-quality links arrive after thumbnails without replacing working ones", () => {
  const first = applyMediaUrls(state([trip({ photos: [{ id: "photo-1", url: "thumb", thumbnailUrl: "thumb", caption: "", date: "2025-01-02", isFavourite: false }] })]), new Map([["photo-1", { url: "original" }]]));
  assert.deepEqual([first.trips[0].photos[0].url, first.trips[0].photos[0].thumbnailUrl], ["original", "thumb"]);
  const failed = applyMediaUrls(first, new Map([["photo-1", { url: "", thumbnailUrl: "" }]]));
  assert.deepEqual([failed.trips[0].photos[0].url, failed.trips[0].photos[0].thumbnailUrl], ["original", "thumb"], "a link that failed to sign never replaces a working one");
});
