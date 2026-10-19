import test from "node:test";
import assert from "node:assert/strict";
import { allPhotos, deriveStatistics, photosForScope, togglePhotoFavourite, validateTrip } from "../src/app/lib/selectors";
import type { AppState, Trip } from "../src/app/types/domain";
import { migrateState } from "../src/app/lib/local-repository";
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
  const value = deriveStatistics(state([trip(), trip({ id: "trip-2", title: "Provence", startDate: "2026-02-01", endDate: "2026-02-04", duration: 4, photos: [] })]));
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
