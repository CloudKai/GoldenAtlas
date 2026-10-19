export interface AppUser {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  isDemo: boolean;
  createdAt: string;
}

export interface TripStop {
  id: string;
  cityId: string;
  city: string;
  countryId: string;
  region?: string;
  latitude: number;
  longitude: number;
  arrivalDate?: string;
  departureDate?: string;
}

export interface MemoryPhoto {
  id: string;
  url: string;
  thumbnailUrl?: string;
  caption: string;
  date: string;
  location?: string;
  isFavourite: boolean;
  size?: number;
  mimeType?: "image/jpeg" | "image/png";
}

export interface Trip {
  id: string;
  countryId: string;
  title: string;
  city: string;
  country: string;
  countryFlag: string;
  startDate: string;
  endDate: string;
  duration: number;
  coverImage: string;
  photos: MemoryPhoto[];
  journal: string;
  favouriteMemory?: string;
  mood: string;
  rating: number;
  companions: string[];
  places: string[];
  stops: TripStop[];
  isFavourite: boolean;
}

export interface AppState {
  schemaVersion: 1;
  userId: string;
  trips: Trip[];
  bucketListIds: string[];
  favouriteCountryId?: string;
  updatedAt: string;
}

export type SlideshowScope =
  | { type: "all" }
  | { type: "favourites" }
  | { type: "country"; countryId: string }
  | { type: "trip"; tripId: string }
  | { type: "selection"; photoIds: string[] };

export interface AppStatistics {
  countriesVisited: number;
  totalCountries: 195;
  totalTrips: number;
  totalTravelDays: number;
  totalPhotos: number;
  yearsTravelled: number;
  mostVisitedCountry?: string;
  firstTrip?: Trip;
  latestTrip?: Trip;
  tripsByYear: Array<{ year: number; count: number }>;
}
