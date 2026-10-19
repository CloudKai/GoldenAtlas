// Photos that did not upload stay here, in memory only, so the trip can offer a retry without asking for them again.
// They are never written to disk: if the page is reloaded they are gone and the user is asked to add them again.
import type { MemoryPhoto } from "../types/domain";
import type { PhotoAsset } from "./local-repository";

export interface PendingUpload {
  photo: MemoryPhoto;
  asset: PhotoAsset;
}

const pending = new Map<string, PendingUpload[]>();

export function stashFailedUploads(tripId: string, uploads: PendingUpload[]) {
  const kept = (pending.get(tripId) ?? []).filter((item) => !uploads.some((upload) => upload.photo.id === item.photo.id));
  const next = [...kept, ...uploads];
  if (next.length) pending.set(tripId, next);
  else pending.delete(tripId);
}

export const failedUploadsFor = (tripId: string): PendingUpload[] => pending.get(tripId) ?? [];

/** Forgets uploads that have since succeeded (or all of a trip's, when no ids are given). */
export function clearFailedUploads(tripId: string, photoIds?: readonly string[]) {
  if (!photoIds) { pending.delete(tripId); return; }
  const remaining = (pending.get(tripId) ?? []).filter((item) => !photoIds.includes(item.photo.id));
  if (remaining.length) pending.set(tripId, remaining);
  else pending.delete(tripId);
}
