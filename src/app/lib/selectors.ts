import { countsTowardWorldTotal } from "../data/countries";
import type { AppState, AppStatistics, MemoryPhoto, SlideshowScope, Trip } from "../types/domain";

export const tripsForCountry = (state: AppState, countryId: string) =>
  state.trips.filter((trip) => trip.countryId === countryId);

export const allPhotos = (state: AppState) =>
  state.trips.flatMap((trip) => trip.photos.map((photo) => ({
    ...photo,
    tripId: trip.id,
    tripTitle: trip.title,
    countryId: trip.countryId,
    country: trip.country,
  })));

export function photosForScope(state: AppState, scope: SlideshowScope): ReturnType<typeof allPhotos> {
  const photos = allPhotos(state);
  if (scope.type === "all") return photos;
  if (scope.type === "favourites") return photos.filter((photo) => photo.isFavourite);
  if (scope.type === "country") return photos.filter((photo) => photo.countryId === scope.countryId);
  if (scope.type === "trip") return photos.filter((photo) => photo.tripId === scope.tripId);
  const selected = new Set(scope.photoIds);
  return photos.filter((photo) => selected.has(photo.id));
}

export function deriveStatistics(state: AppState): AppStatistics {
  const sorted = [...state.trips].sort((a, b) => a.startDate.localeCompare(b.startDate));
  const countries = new Set(state.trips.map((trip) => trip.countryId));
  const years = new Set(state.trips.map((trip) => new Date(`${trip.startDate}T00:00:00`).getFullYear()));
  const countryCounts = new Map<string, { name: string; count: number }>();
  state.trips.forEach((trip) => {
    const current = countryCounts.get(trip.countryId) ?? { name: trip.country, count: 0 };
    current.count += 1;
    countryCounts.set(trip.countryId, current);
  });
  const mostVisitedCountry = [...countryCounts.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))[0]?.name;
  const yearCounts = new Map<number, number>();
  state.trips.forEach((trip) => {
    const year = new Date(`${trip.startDate}T00:00:00`).getFullYear();
    yearCounts.set(year, (yearCounts.get(year) ?? 0) + 1);
  });
  return {
    countriesVisited: countries.size,
    worldCountriesVisited: [...countries].filter(countsTowardWorldTotal).length,
    totalCountries: 195,
    totalTrips: state.trips.length,
    totalTravelDays: state.trips.reduce((sum, trip) => sum + trip.duration, 0),
    totalPhotos: state.trips.reduce((sum, trip) => sum + trip.photos.length, 0),
    yearsTravelled: years.size,
    mostVisitedCountry,
    firstTrip: sorted[0],
    latestTrip: sorted.at(-1),
    tripsByYear: [...yearCounts].map(([year, count]) => ({ year, count })).sort((a, b) => a.year - b.year),
  };
}

export function validateTrip(trip: Pick<Trip, "title" | "countryId" | "startDate" | "endDate" | "stops">) {
  const errors: string[] = [];
  if (!trip.countryId) errors.push("Select a country.");
  if (!trip.title.trim()) errors.push("Enter a trip name.");
  if (!trip.startDate || !trip.endDate) errors.push("Enter both travel dates.");
  if (trip.startDate && trip.endDate && trip.endDate < trip.startDate) errors.push("End date must be on or after the start date.");
  const uniqueCities = new Set(trip.stops.map((stop) => stop.cityId));
  if (uniqueCities.size !== trip.stops.length) errors.push("Remove duplicate city stops.");
  return errors;
}

export function togglePhotoFavourite(trips: Trip[], photoId: string): Trip[] {
  return trips.map((trip) => ({
    ...trip,
    photos: trip.photos.map((photo): MemoryPhoto => photo.id === photoId ? { ...photo, isFavourite: !photo.isFavourite } : photo),
  }));
}
