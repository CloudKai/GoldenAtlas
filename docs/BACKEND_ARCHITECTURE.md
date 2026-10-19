# Backend architecture

## Scope

This backend implements the secure server-side model in the product specification. The Vite web app uses it when `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` are set (otherwise it runs as a browser-only prototype), and the SwiftUI client always uses it. It supports accounts, profiles/preferences, multiple trips per country, journals and trip metadata, private photo memories, companions, places, bucket-list countries, favourites, personal statistics, structured private exports, complete trip cleanup, abandoned-upload cleanup, and account deletion.

Clients build these product flows on the foundation:

1. Register, verify email, sign in, and reset a password.
2. Create one or more trips for a country and attach places and companions.
3. Create a pending memory record, sanitize images locally, upload to its generated private paths, and finalize it.
4. Query ready memories for map, gallery, timeline, favourites, and slideshow screens.
5. Create short-lived signed URLs only while rendering private images.
6. Delete a memory or complete trip through authenticated, media-first deletion functions.
7. Generate an owned JSON export, poll its job state, and request a ten-minute signed download.
8. Delete the account after recent authentication; storage is removed before the Auth identity.

Offline queues, draft/sync-conflict resolution, app cache behavior, photo picking/re-encoding, notifications, and hosted OAuth credentials remain client or deployment work. Structured exports contain all application metadata and a memory manifest, but do not embed original image bytes. Image-inclusive archives require a chunked durable worker rather than one Edge Function.

## Components

- Supabase Auth owns identities and email verification. An `auth.users` trigger creates one profile and preference row.
- Postgres stores travel metadata and enforces ownership using RLS plus composite foreign keys.
- Supabase Storage keeps originals and thumbnails in separate private buckets.
- Authenticated Edge Functions perform privileged memory finalization and media-first deletion.
- Private export objects live in `user-exports`; no client storage policy exposes them.
- Secret-key-only cleanup workers remove expired exports and stale pending/failed uploads in bounded batches.
- `personal_statistics` is a `security_invoker` view, so it inherits the caller's RLS visibility.

The browser/native client uses only the project URL and publishable key. The service role is available only inside trusted Edge Functions and local/CI test setup.

## Read patterns

Trips are cursor-friendly by `(start_date, id)`. Memories are cursor-friendly by `(taken_at, id)` and gallery order by `(trip_id, display_order, id)`. A country can have any number of trips. Slideshow and gallery queries should filter `upload_status = 'ready'`; pending or failed uploads must not be presented as completed memories.

## Export lifecycle

`request-data-export` deduplicates active or unexpired jobs, reads only through the caller's RLS-scoped client, writes a maximum 10 MiB JSON document through the server client, and marks the job complete for 24 hours. `get-export-download` rechecks ownership and expiry and creates a 600-second signed URL. The object path is never logged. `cleanup-expired-exports` is invoked by a trusted scheduler using a Supabase server secret and deletes up to 100 expired objects per call.

## Deletion lifecycle

`delete-memory` and `delete-trip` remove registered objects before metadata. `delete-account` requires a token issued within the last 15 minutes and the exact confirmation string `DELETE`. It creates or resumes one deletion request, which immediately prevents new memory creation; cancels exports; removes export, original, and thumbnail objects; then hard-deletes the Auth user so database foreign-key cascades remove the remaining application rows. Missing objects and repeated media/trip operations are safe. A failure leaves the Auth user and minimal retry state intact.

Supabase access JWTs cannot be cryptographically revoked before expiry. Deleting the Auth user removes all refresh/session state and all application data; the configured one-hour JWT lifetime bounds residual token validity, and RLS finds no owned rows after deletion.
