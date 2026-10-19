import type { MemoryPhoto as Photo, Trip, TripStop } from "../types/domain";
export type { TripStop } from "../types/domain";

export interface CityOption {
  id: string;
  city: string;
  countryId: string;
  region?: string;
  latitude: number;
  longitude: number;
}

export interface CityVisitSummary extends CityOption {
  visitCount: number;
  lastVisited: string;
  tripIds: string[];
  photoCount: number;
  photos: Photo[];
}

export interface CityMapMarker {
  id: string;
  name: string;
  region?: string;
  x: number;
  y: number;
  visitCount: number;
}

export const CITY_OPTIONS: CityOption[] = [
  { id: "fr-paris", city: "Paris", countryId: "FR", region: "Île-de-France", latitude: 48.8566, longitude: 2.3522 },
  { id: "fr-marseille", city: "Marseille", countryId: "FR", region: "Provence-Alpes-Côte d’Azur", latitude: 43.2965, longitude: 5.3698 },
  { id: "fr-aix", city: "Aix-en-Provence", countryId: "FR", region: "Provence-Alpes-Côte d’Azur", latitude: 43.5297, longitude: 5.4474 },
  { id: "it-positano", city: "Positano", countryId: "IT", region: "Campania", latitude: 40.6281, longitude: 14.4849 },
  { id: "it-rome", city: "Rome", countryId: "IT", region: "Lazio", latitude: 41.9028, longitude: 12.4964 },
  { id: "it-florence", city: "Florence", countryId: "IT", region: "Tuscany", latitude: 43.7696, longitude: 11.2558 },
  { id: "it-siena", city: "Siena", countryId: "IT", region: "Tuscany", latitude: 43.3188, longitude: 11.3308 },
  { id: "jp-tokyo", city: "Tokyo", countryId: "JP", region: "Tokyo", latitude: 35.6762, longitude: 139.6503 },
  { id: "jp-kyoto", city: "Kyoto", countryId: "JP", region: "Kyoto", latitude: 35.0116, longitude: 135.7681 },
  { id: "jp-nara", city: "Nara", countryId: "JP", region: "Nara", latitude: 34.6851, longitude: 135.8048 },
  { id: "jp-osaka", city: "Osaka", countryId: "JP", region: "Osaka", latitude: 34.6937, longitude: 135.5023 },
  { id: "th-bangkok", city: "Bangkok", countryId: "TH", region: "Bangkok", latitude: 13.7563, longitude: 100.5018 },
  { id: "th-chiang-mai", city: "Chiang Mai", countryId: "TH", region: "Chiang Mai", latitude: 18.7883, longitude: 98.9853 },
  { id: "au-sydney", city: "Sydney", countryId: "AU", region: "New South Wales", latitude: -33.8688, longitude: 151.2093 },
  { id: "gb-london", city: "London", countryId: "GB", region: "England", latitude: 51.5072, longitude: -0.1276 },
  { id: "us-new-york", city: "New York", countryId: "US", region: "New York", latitude: 40.7128, longitude: -74.006 },
  { id: "ma-marrakech", city: "Marrakech", countryId: "MA", region: "Marrakesh-Safi", latitude: 31.6295, longitude: -7.9811 },
  { id: "pt-lisbon", city: "Lisbon", countryId: "PT", region: "Lisbon", latitude: 38.7223, longitude: -9.1393 },
];

const MAP_WIDTH = 1009.6727;
const MAP_LEFT_LONGITUDE = -169.110266;
const MAP_RIGHT_LONGITUDE = 190.486279;
const MAP_EQUATOR_Y = 467;
const MAP_LATITUDE_SCALE = 3.2;

/** Converts geographic coordinates into the calibrated coordinate space used
 * by the existing MapSVG world asset. Kept isolated for a future map adapter. */
export function projectCityCoordinates(latitude: number, longitude: number) {
  return {
    x: ((longitude - MAP_LEFT_LONGITUDE) / (MAP_RIGHT_LONGITUDE - MAP_LEFT_LONGITUDE)) * MAP_WIDTH,
    y: MAP_EQUATOR_Y - latitude * MAP_LATITUDE_SCALE,
  };
}

function normalise(value: string | undefined) {
  return value?.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase() ?? "";
}

function photosForStop(trip: Trip, stop: TripStop) {
  const city = normalise(stop.city);
  const exact = trip.photos.filter((photo) => normalise(`${photo.location ?? ""} ${photo.caption}`).includes(city));
  return exact.length > 0 ? exact : trip.photos.slice(0, 2);
}

export function getCityVisitSummaries(trips: Trip[], countryId: string): CityVisitSummary[] {
  const grouped = new Map<string, CityVisitSummary>();

  trips.filter((trip) => trip.countryId === countryId).forEach((trip) => {
    trip.stops.forEach((stop) => {
      const existing = grouped.get(stop.cityId);
      const lastVisited = stop.departureDate ?? trip.endDate;
      const stopPhotos = photosForStop(trip, stop);

      if (!existing) {
        grouped.set(stop.cityId, {
          id: stop.cityId,
          city: stop.city,
          countryId: stop.countryId,
          region: stop.region,
          latitude: stop.latitude,
          longitude: stop.longitude,
          visitCount: 1,
          lastVisited,
          tripIds: [trip.id],
          photoCount: stopPhotos.length,
          photos: stopPhotos,
        });
        return;
      }

      if (!existing.tripIds.includes(trip.id)) {
        existing.tripIds.push(trip.id);
        existing.visitCount += 1;
      }
      existing.lastVisited = existing.lastVisited > lastVisited ? existing.lastVisited : lastVisited;
      const knownPhotos = new Set(existing.photos.map((photo) => photo.id));
      stopPhotos.forEach((photo) => {
        if (!knownPhotos.has(photo.id)) existing.photos.push(photo);
      });
      existing.photoCount = existing.photos.length;
    });
  });

  return [...grouped.values()].sort((a, b) => b.lastVisited.localeCompare(a.lastVisited));
}

export function toCityMapMarkers(cities: CityVisitSummary[]): CityMapMarker[] {
  return cities.map((city) => ({
    id: city.id,
    name: city.city,
    region: city.region,
    visitCount: city.visitCount,
    ...projectCityCoordinates(city.latitude, city.longitude),
  }));
}

export function createTripStop(option: CityOption, tripId: string): TripStop {
  return {
    id: `${tripId}-${option.id}`,
    cityId: option.id,
    city: option.city,
    countryId: option.countryId,
    region: option.region,
    latitude: option.latitude,
    longitude: option.longitude,
  };
}
