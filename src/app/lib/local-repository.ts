import type { AppState, AppUser, MemoryPhoto } from "../types/domain";

const DB_NAME = "golden-atlas-prototype";
const DB_VERSION = 2;
const SESSION_KEY = "golden-atlas:session-user";
const ADMIN_SESSION_KEY = "golden-atlas:admin-session";
const ADMIN_RECORD_ID = "local-admin";
export const ADMIN_USERNAME = "admin";

interface AccountRecord extends AppUser {
  passwordSalt?: string;
  passwordHash?: string;
}

interface AdminRecord {
  id: typeof ADMIN_RECORD_ID;
  username: typeof ADMIN_USERNAME;
  passwordSalt: string;
  passwordHash: string;
  createdAt: string;
}

export interface AdminSummary {
  accounts: number;
  trips: number;
  photos: number;
}

export interface PhotoAsset {
  id: string;
  userId: string;
  original: Blob;
  thumbnail: Blob;
  width?: number;
  height?: number;
}

// Mirrors the storage bucket limits so oversized renders are re-encoded instead of rejected by the server.
const MAX_SOURCE_BYTES = 50 * 1024 * 1024;
const MAX_ORIGINAL_BYTES = 15 * 1024 * 1024;
const MAX_THUMBNAIL_BYTES = 500 * 1024;

function request<T>(value: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    value.onsuccess = () => resolve(value.result);
    value.onerror = () => reject(value.error ?? new Error("Local storage request failed."));
  });
}

function transactionDone(transaction: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Local storage transaction failed."));
    transaction.onabort = () => reject(transaction.error ?? new Error("Local storage transaction was cancelled."));
  });
}

function bytesToBase64(bytes: Uint8Array) {
  let value = "";
  bytes.forEach((byte) => { value += String.fromCharCode(byte); });
  return btoa(value);
}

function base64ToBytes(value: string) {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
}

async function passwordDigest(password: string, salt?: Uint8Array) {
  const activeSalt = salt ?? crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const hash = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: activeSalt as BufferSource, iterations: 120_000 }, key, 256);
  return { salt: bytesToBase64(activeSalt), hash: bytesToBase64(new Uint8Array(hash)) };
}

function emptyState(userId: string): AppState {
  return { schemaVersion: 1, userId, trips: [], bucketListIds: [], updatedAt: new Date().toISOString() };
}

export function migrateState(value: unknown, userId: string): AppState {
  if (!value || typeof value !== "object") return emptyState(userId);
  const legacy = value as Partial<AppState>;
  return {
    schemaVersion: 1,
    userId,
    trips: Array.isArray(legacy.trips) ? legacy.trips.map((trip) => ({ ...trip, days: Array.isArray(trip.days) ? trip.days : [] })) : [],
    bucketListIds: Array.isArray(legacy.bucketListIds) ? [...new Set(legacy.bucketListIds)] : [],
    favouriteCountryId: typeof legacy.favouriteCountryId === "string" ? legacy.favouriteCountryId : undefined,
    updatedAt: typeof legacy.updatedAt === "string" ? legacy.updatedAt : new Date().toISOString(),
  };
}

export class LocalRepository {
  private database?: IDBDatabase;

  async open() {
    if (this.database) return this.database;
    if (!("indexedDB" in window)) throw new Error("This browser does not support the local storage required by Golden Atlas.");
    const openRequest = indexedDB.open(DB_NAME, DB_VERSION);
    openRequest.onupgradeneeded = () => {
      const db = openRequest.result;
      if (!db.objectStoreNames.contains("accounts")) db.createObjectStore("accounts", { keyPath: "id" }).createIndex("email", "email", { unique: true });
      if (!db.objectStoreNames.contains("states")) db.createObjectStore("states", { keyPath: "userId" });
      if (!db.objectStoreNames.contains("photos")) {
        const photos = db.createObjectStore("photos", { keyPath: "id" });
        photos.createIndex("userId", "userId", { unique: false });
      }
      if (!db.objectStoreNames.contains("admin")) db.createObjectStore("admin", { keyPath: "id" });
    };
    this.database = await request(openRequest);
    return this.database;
  }

  private async store(name: "accounts" | "states" | "photos" | "admin", mode: IDBTransactionMode = "readonly") {
    const db = await this.open();
    const tx = db.transaction(name, mode);
    return { tx, store: tx.objectStore(name) };
  }

  getSessionUserId() { return sessionStorage.getItem(SESSION_KEY); }
  clearSession() { sessionStorage.removeItem(SESSION_KEY); }
  hasAdminSession() { return sessionStorage.getItem(ADMIN_SESSION_KEY) === ADMIN_RECORD_ID; }
  clearAdminSession() { sessionStorage.removeItem(ADMIN_SESSION_KEY); }

  async getUser(userId: string) {
    const { store } = await this.store("accounts");
    const record = await request(store.get(userId)) as AccountRecord | undefined;
    if (!record) return null;
    const { passwordHash: _hash, passwordSalt: _salt, ...user } = record;
    return user;
  }

  async getState(userId: string) {
    const { store } = await this.store("states");
    const stored = await request(store.get(userId)) as AppState | undefined;
    return stored ? migrateState(stored, userId) : null;
  }

  async saveState(state: AppState) {
    const next = { ...state, updatedAt: new Date().toISOString() };
    const { tx, store } = await this.store("states", "readwrite");
    store.put(next);
    await transactionDone(tx);
    return next;
  }

  async createAccount(name: string, email: string, password: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const db = await this.open();
    const existingTx = db.transaction("accounts");
    const existing = await request(existingTx.objectStore("accounts").index("email").get(normalizedEmail));
    if (existing) throw new Error("An account already exists for this email.");
    const digest = await passwordDigest(password);
    const user: AccountRecord = {
      id: crypto.randomUUID(), name: name.trim(), email: normalizedEmail, isDemo: false,
      createdAt: new Date().toISOString(), passwordSalt: digest.salt, passwordHash: digest.hash,
    };
    const tx = db.transaction(["accounts", "states"], "readwrite");
    tx.objectStore("accounts").add(user);
    tx.objectStore("states").add(emptyState(user.id));
    await transactionDone(tx);
    sessionStorage.setItem(SESSION_KEY, user.id);
    const { passwordHash: _hash, passwordSalt: _salt, ...publicUser } = user;
    return { user: publicUser, state: emptyState(user.id) };
  }

  /** Removes every guest account with its trips and photos. Guest sessions cannot be resumed once their tab is gone. */
  private async purgeGuests() {
    const db = await this.open();
    const tx = db.transaction(["accounts", "states", "photos"], "readwrite");
    const accounts = tx.objectStore("accounts");
    const states = tx.objectStore("states");
    const photos = tx.objectStore("photos");
    const everyone = await request(accounts.getAll()) as AccountRecord[];
    for (const guest of everyone.filter((account) => account.isGuest)) {
      accounts.delete(guest.id);
      states.delete(guest.id);
      const ids = await request(photos.index("userId").getAllKeys(guest.id));
      ids.forEach((id) => photos.delete(id));
    }
    await transactionDone(tx);
  }

  /** Starts a passwordless guest session whose data never leaves this browser. */
  async createGuest() {
    await this.purgeGuests();
    const db = await this.open();
    const id = crypto.randomUUID();
    // `.invalid` is a reserved TLD, so this address can never belong to a real person or receive mail.
    const user: AccountRecord = { id, name: "Guest", email: `guest-${id}@guest.invalid`, isDemo: false, isGuest: true, createdAt: new Date().toISOString() };
    const tx = db.transaction(["accounts", "states"], "readwrite");
    tx.objectStore("accounts").add(user);
    tx.objectStore("states").add(emptyState(id));
    await transactionDone(tx);
    sessionStorage.setItem(SESSION_KEY, id);
    return { user: user as AppUser, state: emptyState(id) };
  }

  async signIn(email: string, password: string) {
    const { store } = await this.store("accounts");
    const record = await request(store.index("email").get(email.trim().toLowerCase())) as AccountRecord | undefined;
    if (!record?.passwordHash || !record.passwordSalt) throw new Error("Email or password is incorrect.");
    const digest = await passwordDigest(password, base64ToBytes(record.passwordSalt));
    if (digest.hash !== record.passwordHash) throw new Error("Email or password is incorrect.");
    sessionStorage.setItem(SESSION_KEY, record.id);
    const state = await this.getState(record.id) ?? emptyState(record.id);
    const { passwordHash: _hash, passwordSalt: _salt, ...user } = record;
    return { user, state };
  }

  async hasAdminAccount() {
    const { store } = await this.store("admin");
    return Boolean(await request(store.get(ADMIN_RECORD_ID)));
  }

  async setupAdmin(password: string) {
    if (password.length < 12) throw new Error("Use at least 12 characters for the admin password.");
    if (await this.hasAdminAccount()) throw new Error("The admin account is already configured.");
    const digest = await passwordDigest(password);
    const { tx, store } = await this.store("admin", "readwrite");
    const record: AdminRecord = {
      id: ADMIN_RECORD_ID,
      username: ADMIN_USERNAME,
      passwordSalt: digest.salt,
      passwordHash: digest.hash,
      createdAt: new Date().toISOString(),
    };
    store.add(record);
    await transactionDone(tx);
    sessionStorage.setItem(ADMIN_SESSION_KEY, ADMIN_RECORD_ID);
  }

  async adminSignIn(username: string, password: string) {
    const { store } = await this.store("admin");
    const record = await request(store.get(ADMIN_RECORD_ID)) as AdminRecord | undefined;
    if (!record || username.trim().toLowerCase() !== record.username) throw new Error("Admin login or password is incorrect.");
    const digest = await passwordDigest(password, base64ToBytes(record.passwordSalt));
    if (digest.hash !== record.passwordHash) throw new Error("Admin login or password is incorrect.");
    sessionStorage.setItem(ADMIN_SESSION_KEY, ADMIN_RECORD_ID);
  }

  async getAdminSummary(): Promise<AdminSummary> {
    if (!this.hasAdminSession()) throw new Error("Admin authentication is required.");
    const db = await this.open();
    const tx = db.transaction(["accounts", "states", "photos"]);
    const accountRequest = tx.objectStore("accounts").getAll();
    const stateRequest = tx.objectStore("states").getAll();
    const photoRequest = tx.objectStore("photos").count();
    const [allAccounts, allStates, photos] = await Promise.all([
      request(accountRequest) as Promise<AccountRecord[]>,
      request(stateRequest) as Promise<AppState[]>,
      request(photoRequest),
    ]);
    const accountIds = new Set(allAccounts.filter((account) => !account.isDemo && !account.isGuest).map((account) => account.id));
    return {
      accounts: accountIds.size,
      trips: allStates.filter((state) => accountIds.has(state.userId)).reduce((total, state) => total + state.trips.length, 0),
      photos,
    };
  }

  async updateProfile(userId: string, changes: Pick<AppUser, "name" | "email">) {
    const db = await this.open();
    const record = await request(db.transaction("accounts").objectStore("accounts").get(userId)) as AccountRecord;
    const next = { ...record, name: changes.name.trim(), email: changes.email.trim().toLowerCase() };
    const tx = db.transaction("accounts", "readwrite");
    const store = tx.objectStore("accounts");
    store.put(next);
    await transactionDone(tx);
    const { passwordHash: _hash, passwordSalt: _salt, ...user } = next;
    return user;
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const db = await this.open();
    const record = await request(db.transaction("accounts").objectStore("accounts").get(userId)) as AccountRecord;
    if (record.isDemo) throw new Error("The demo account password cannot be changed.");
    if (record.isGuest) throw new Error("Guest sessions have no password. Create an account to set one.");
    const current = await passwordDigest(currentPassword, base64ToBytes(record.passwordSalt!));
    if (current.hash !== record.passwordHash) throw new Error("Current password is incorrect.");
    const next = await passwordDigest(newPassword);
    const tx = db.transaction("accounts", "readwrite");
    tx.objectStore("accounts").put({ ...record, passwordSalt: next.salt, passwordHash: next.hash });
    await transactionDone(tx);
  }

  async savePhotoAssets(assets: PhotoAsset[]) {
    if (!assets.length) return;
    const { tx, store } = await this.store("photos", "readwrite");
    assets.forEach((asset) => store.put(asset));
    await transactionDone(tx);
  }

  async deletePhotoAssets(photoIds: string[]) {
    const { tx, store } = await this.store("photos", "readwrite");
    photoIds.forEach((id) => store.delete(id));
    await transactionDone(tx);
  }

  async deleteAccount(userId: string) {
    const db = await this.open();
    const tx = db.transaction(["accounts", "states", "photos"], "readwrite");
    tx.objectStore("accounts").delete(userId);
    tx.objectStore("states").delete(userId);
    const photoStore = tx.objectStore("photos");
    const ids = await request(photoStore.index("userId").getAllKeys(userId));
    ids.forEach((id) => photoStore.delete(id));
    await transactionDone(tx);
    this.clearSession();
  }
}

export async function sanitizePhoto(file: File, userId: string): Promise<{ photo: MemoryPhoto; asset: PhotoAsset }> {
  // Every photo is decoded and re-encoded to a bounded JPEG below, so the source format and size can be generous.
  // Whatever the browser can decode is welcome (JPEG, PNG, WebP, AVIF, and HEIC on Safari).
  if (file.type && !file.type.startsWith("image/")) throw new Error("That file isn’t a photo. Choose an image file.");
  if (file.size > MAX_SOURCE_BYTES) throw new Error("This image is larger than 50 MiB. Choose a smaller file.");
  const bitmap = await createImageBitmap(file).catch(() => { throw new Error("Your browser can’t read this image format. Try a JPEG or PNG version of it."); });
  const render = async (maxSide: number, quality: number) => {
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error("The image could not be processed.")), "image/jpeg", quality));
    return { blob, width: canvas.width, height: canvas.height };
  };
  const fitWithin = async (limit: number, attempts: Array<[number, number]>) => {
    let result = await render(...attempts[0]);
    for (const attempt of attempts.slice(1)) {
      if (result.blob.size <= limit) break;
      result = await render(...attempt);
    }
    if (result.blob.size > limit) throw new Error("This image could not be reduced to an uploadable size. Choose a smaller image.");
    return result;
  };
  let rendered: Awaited<ReturnType<typeof render>>;
  let thumbnailRender: Awaited<ReturnType<typeof render>>;
  try {
    // Re-encoding through a canvas also drops EXIF and GPS metadata.
    rendered = await fitWithin(MAX_ORIGINAL_BYTES, [[2600, .9], [2200, .8], [1800, .7]]);
    thumbnailRender = await fitWithin(MAX_THUMBNAIL_BYTES, [[720, .82], [720, .7], [600, .6], [480, .5]]);
  } finally { bitmap.close(); }
  const original = rendered.blob;
  const thumbnail = thumbnailRender.blob;
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error("The image could not be read.")); reader.readAsDataURL(original);
  });
  const id = crypto.randomUUID();
  return {
    photo: { id, url: dataUrl, thumbnailUrl: dataUrl, caption: file.name.replace(/\.[^.]+$/, ""), date: new Date().toISOString().slice(0, 10), isFavourite: false, size: original.size, mimeType: "image/jpeg" },
    asset: { id, userId, original, thumbnail, width: rendered.width, height: rendered.height },
  };
}

export const localRepository = new LocalRepository();
