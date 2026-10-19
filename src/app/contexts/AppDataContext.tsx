import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { localRepository, type PhotoAsset } from "../lib/local-repository";
import { deriveStatistics, togglePhotoFavourite } from "../lib/selectors";
import type { AppState, AppUser, Trip } from "../types/domain";

interface AppDataValue {
  ready: boolean;
  storageError: string;
  user: AppUser | null;
  state: AppState | null;
  statistics: ReturnType<typeof deriveStatistics> | null;
  register(name: string, email: string, password: string): Promise<void>;
  signIn(email: string, password: string): Promise<void>;
  signOut(): void;
  saveTrip(trip: Trip, assets?: PhotoAsset[]): Promise<void>;
  deleteTrip(tripId: string): Promise<void>;
  toggleTripFavourite(tripId: string): Promise<void>;
  togglePhotoFavourite(photoId: string): Promise<void>;
  toggleBucketList(countryId: string): Promise<void>;
  setFavouriteCountry(countryId?: string): Promise<void>;
  updateProfile(name: string, email: string): Promise<void>;
  changePassword(currentPassword: string, newPassword: string): Promise<void>;
  deleteAccount(): Promise<void>;
}

const AppDataContext = createContext<AppDataValue | null>(null);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState("");
  const [user, setUser] = useState<AppUser | null>(null);
  const [state, setState] = useState<AppState | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        await localRepository.open();
        const userId = localRepository.getSessionUserId();
        if (userId && active) {
          const [nextUser, nextState] = await Promise.all([localRepository.getUser(userId), localRepository.getState(userId)]);
          if (nextUser && nextState) { setUser(nextUser); setState(nextState); }
          else localRepository.clearSession();
        }
      } catch (error) {
        if (active) setStorageError(error instanceof Error ? error.message : "Local storage is unavailable.");
      } finally { if (active) setReady(true); }
    })();
    return () => { active = false; };
  }, []);

  const commit = useCallback(async (producer: (current: AppState) => AppState) => {
    if (!state) throw new Error("Sign in before changing your atlas.");
    const next = producer(state);
    const saved = await localRepository.saveState(next);
    setState(saved);
  }, [state]);

  const value = useMemo<AppDataValue>(() => ({
    ready, storageError, user, state, statistics: state ? deriveStatistics(state) : null,
    register: async (name, email, password) => { const next = await localRepository.createAccount(name, email, password); setUser(next.user); setState(next.state); },
    signIn: async (email, password) => { const next = await localRepository.signIn(email, password); setUser(next.user); setState(next.state); },
    signOut: () => { localRepository.clearSession(); setUser(null); setState(null); },
    saveTrip: async (trip, assets = []) => {
      await localRepository.savePhotoAssets(assets);
      await commit((current) => ({ ...current, trips: current.trips.some((item) => item.id === trip.id) ? current.trips.map((item) => item.id === trip.id ? trip : item) : [trip, ...current.trips] }));
    },
    deleteTrip: async (tripId) => {
      const trip = state?.trips.find((item) => item.id === tripId);
      if (trip) await localRepository.deletePhotoAssets(trip.photos.filter((photo) => photo.url.startsWith("data:" )).map((photo) => photo.id));
      await commit((current) => ({ ...current, trips: current.trips.filter((item) => item.id !== tripId) }));
    },
    toggleTripFavourite: (tripId) => commit((current) => ({ ...current, trips: current.trips.map((trip) => trip.id === tripId ? { ...trip, isFavourite: !trip.isFavourite } : trip) })),
    togglePhotoFavourite: (photoId) => commit((current) => ({ ...current, trips: togglePhotoFavourite(current.trips, photoId) })),
    toggleBucketList: (countryId) => commit((current) => ({ ...current, bucketListIds: current.bucketListIds.includes(countryId) ? current.bucketListIds.filter((id) => id !== countryId) : [...current.bucketListIds, countryId] })),
    setFavouriteCountry: (countryId) => commit((current) => ({ ...current, favouriteCountryId: countryId })),
    updateProfile: async (name, email) => { if (!user) return; setUser(await localRepository.updateProfile(user.id, { name, email })); },
    changePassword: async (currentPassword, newPassword) => { if (!user) return; await localRepository.changePassword(user.id, currentPassword, newPassword); },
    deleteAccount: async () => { if (!user) return; await localRepository.deleteAccount(user.id); setUser(null); setState(null); },
  }), [commit, ready, state, storageError, user]);

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const value = useContext(AppDataContext);
  if (!value) throw new Error("useAppData must be used inside AppDataProvider.");
  return value;
}
