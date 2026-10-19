import type { AppState, AppUser } from "../types/domain";
import type { AtlasBackend, AtlasSession } from "./backend";
import { localRepository } from "./local-repository";
import { togglePhotoFavourite } from "./selectors";

/** Browser-only backend used by the design prototype. Data never leaves this device. */
export function createLocalBackend(): AtlasBackend {
  const persist = (next: AppState) => localRepository.saveState(next);
  const hostedOnly = () => new Error("Email-based password reset requires the hosted authentication service.");

  return {
    kind: "local",

    async init(): Promise<AtlasSession | null> {
      await localRepository.open();
      const userId = localRepository.getSessionUserId();
      if (!userId) return null;
      const [user, state] = await Promise.all([localRepository.getUser(userId), localRepository.getState(userId)]);
      if (user && state) return { user, state };
      localRepository.clearSession();
      return null;
    },

    onSignedOut: () => () => {},

    async register(name, email, password) {
      return { status: "signed-in", session: await localRepository.createAccount(name, email, password) };
    },

    signIn: (email, password) => localRepository.signIn(email, password),

    async signOut() { localRepository.clearSession(); },

    async requestPasswordReset() { throw hostedOnly(); },
    async completePasswordReset() { throw hostedOnly(); },

    async saveTrip(state, trip, assets) {
      await localRepository.savePhotoAssets(assets);
      const exists = state.trips.some((item) => item.id === trip.id);
      const trips = exists ? state.trips.map((item) => item.id === trip.id ? trip : item) : [trip, ...state.trips];
      return { state: await persist({ ...state, trips }), warnings: [] };
    },

    async deleteTrip(state, tripId) {
      const trip = state.trips.find((item) => item.id === tripId);
      if (trip) await localRepository.deletePhotoAssets(trip.photos.filter((photo) => photo.url.startsWith("data:")).map((photo) => photo.id));
      return persist({ ...state, trips: state.trips.filter((item) => item.id !== tripId) });
    },

    toggleTripFavourite: (state, tripId) => persist({ ...state, trips: state.trips.map((trip) => trip.id === tripId ? { ...trip, isFavourite: !trip.isFavourite } : trip) }),

    togglePhotoFavourite: (state, photoId) => persist({ ...state, trips: togglePhotoFavourite(state.trips, photoId) }),

    toggleBucketList: (state, countryId) => persist({
      ...state,
      bucketListIds: state.bucketListIds.includes(countryId) ? state.bucketListIds.filter((id) => id !== countryId) : [...state.bucketListIds, countryId],
    }),

    setFavouriteCountry: (state, countryId) => persist({ ...state, favouriteCountryId: countryId }),

    async updateProfile(user: AppUser, name, email) {
      return { user: await localRepository.updateProfile(user.id, { name, email }) };
    },

    changePassword: (user, currentPassword, newPassword) => localRepository.changePassword(user.id, currentPassword, newPassword),

    async deleteAccount(user) { await localRepository.deleteAccount(user.id); },
  };
}
