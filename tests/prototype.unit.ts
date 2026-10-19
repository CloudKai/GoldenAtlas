import test from "node:test";
import assert from "node:assert/strict";
import { allPhotos, deriveStatistics, photosForScope, togglePhotoFavourite, validateTrip } from "../src/app/lib/selectors";
import type { AppState, Trip } from "../src/app/types/domain";
import { migrateState } from "../src/app/lib/local-repository";

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
