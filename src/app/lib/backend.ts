import type { AppState, AppUser, Trip } from "../types/domain";
import type { PhotoAsset } from "./local-repository";
import type { MediaUrls } from "./supabase-mappers";
import type { AccountPreferences, PreferencesPatch } from "./preferences-sync";

export interface AtlasSession {
  user: AppUser;
  state: AppState;
  /** The account's saved settings, when the backend keeps them. `untouched` means they are still the defaults. */
  preferences?: { values: AccountPreferences; untouched: boolean };
}

export interface SaveProgress {
  stage: "details" | "photos";
  done: number;
  total: number;
}

export interface SaveResult {
  state: AppState;
  warnings: string[];
  /** Photos that did not upload. The trip itself is saved. */
  failedPhotoIds: string[];
}

export type RegisterResult =
  | { status: "signed-in"; session: AtlasSession }
  | { status: "verify-email"; email: string };

/**
 * Storage and account operations used by the UI. `local` keeps everything in this browser (design prototype);
 * `supabase` talks to the authenticated Golden Atlas backend. Mutations take the current state and resolve to the next one.
 */
export interface AtlasBackend {
  readonly kind: "local" | "supabase";
  init(): Promise<AtlasSession | null>;
  /** Fires when the session ends outside an explicit sign-out, for example when a refresh token is revoked. */
  onSignedOut(listener: () => void): () => void;
  register(name: string, email: string, password: string): Promise<RegisterResult>;
  signIn(email: string, password: string): Promise<AtlasSession>;
  /** Starts a device-only guest session. Only the browser-local backend provides this. */
  startGuest?(): Promise<AtlasSession>;
  signOut(): Promise<void>;
  requestPasswordReset(email: string): Promise<void>;
  completePasswordReset(newPassword: string): Promise<void>;
  saveTrip(state: AppState, trip: Trip, assets: PhotoAsset[], onProgress?: (progress: SaveProgress) => void): Promise<SaveResult>;
  deleteTrip(state: AppState, tripId: string): Promise<AppState>;
  toggleTripFavourite(state: AppState, tripId: string): Promise<AppState>;
  togglePhotoFavourite(state: AppState, photoId: string): Promise<AppState>;
  toggleBucketList(state: AppState, countryId: string): Promise<AppState>;
  setFavouriteCountry(state: AppState, countryId?: string): Promise<AppState>;
  updateProfile(user: AppUser, name: string, email: string): Promise<{ user: AppUser; notice?: string }>;
  changePassword(user: AppUser, currentPassword: string, newPassword: string): Promise<void>;
  deleteAccount(user: AppUser, password?: string): Promise<void>;
  /** Re-signs private image URLs before they expire. Only present for backends that use expiring URLs. */
  refreshMedia?(photoIds: string[], scope?: "originals" | "all"): Promise<Map<string, MediaUrls>>;
  /** Stores settings on the account so they follow the user. Only present for backends with accounts. */
  savePreferences?(patch: PreferencesPatch): Promise<void>;
  /** Prepares a server-generated export. Only present for backends with server-side export. */
  exportData?(): Promise<Blob>;
}
