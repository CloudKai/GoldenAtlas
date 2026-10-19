# Privacy and media data flow

Photos and travel history are private by default.

## Upload

1. The SwiftUI client uses `PhotosPicker` and receives only photos explicitly selected by the user.
2. On device, it decodes and re-encodes each image, converts HEIC when needed, strips EXIF/GPS by default, and creates a JPEG thumbnail. The user may retain only an app-level location label/coordinate when explicitly chosen; original embedded metadata must still be removed.
3. The client inserts a pending `memories` row with the sanitized original MIME and both sizes.
4. A database trigger ignores client paths and generates unpredictable paths under the authenticated ownership/trip/memory boundary.
5. The client uploads once to those exact paths with `upsert: false`.
6. `finalize-memory-upload` checks both stored objects and marks the record `ready`. UI queries display only ready memories.

The free-tier backend validates object metadata but cannot decode image content or prove that EXIF was removed. Client-side processing is therefore a security requirement, not merely a UI optimization.

## Viewing

Metadata reads are protected by table RLS. The authenticated client requests a signed original or thumbnail URL under Storage RLS only when needed. URLs expire after 600 seconds and are held in memory, not stored in database rows, persistent caches, analytics, crash reports, or application logs. Physical thumbnails avoid relying on hosted image transformations.

## Deletion

The client calls `delete-memory` or `delete-trip`; both remove private objects before metadata and are safe to retry after interruption. A secret-key-only worker deletes pending/failed uploads older than 24 hours in batches of 100.

Account deletion requires recent authentication and an explicit confirmation. A deletion row first blocks new memories. The function removes export archives, originals, and thumbnails, then hard-deletes the Auth user; foreign-key cascades remove profiles, preferences, trips, places, companions, bucket-list entries, and job rows. Storage or database failure leaves the account and minimum failure code available for retry. Provider backups may retain deleted database pages for the provider's configured backup window; deletion from active application systems is not a guarantee of immediate backup erasure.

## Export

An authenticated user can generate a private JSON export containing profile, preferences, trips, per-day diaries, memory metadata, journals/captions, companions, places, and bucket-list entries. RLS-scoped reads ensure it contains only the requester. The object expires after 24 hours and its signed URL after 10 minutes. Expired objects are removed on access, on the next request, or by the scheduled cleanup worker. The current export includes a media manifest but not image bytes; building image-inclusive ZIP archives is deferred to a durable chunked worker because Edge Function memory/CPU/duration limits make a single-request archive unsafe.

## Data inventory and retention

| Data | Purpose | Active retention | Deletion path |
| --- | --- | --- | --- |
| Auth identity | Sign-in and account recovery | Account lifetime | Auth hard delete |
| Profile/preferences | Personalisation and privacy choices | Account lifetime | Auth cascade |
| Trips/journals/places | Private travel diary | User controlled | Row/trip/account deletion |
| Original/thumbnail images | Private memories and efficient display | Until memory/trip/account deletion | Storage API before metadata |
| Pending/failed uploads | Upload recovery | 24 hours | Cleanup worker |
| JSON exports | Portability | 24 hours | Expiry/access cleanup worker |
| Function logs | Operations without private content | Hosting log policy | Provider/operator retention |

## Third parties and logging

Supabase provides Auth, Postgres, Storage, Edge Functions, and hosted logs. GeoNames supplies country reference data and receives no user data. Google, Apple, SMTP providers, analytics, and crash reporting are not active from this local backend. Before enabling any provider, update the processor list and retention terms.

Logs may include a random request ID, function name, outcome, safe error code, and duration. They must not contain email, tokens, signed URLs, object paths, captions, journals, exact coordinates, or image content.

## Consent fields

`remove_photo_gps_by_default` defaults to true. `analytics_consent` defaults to false. Exact coordinates in `places` are optional and paired; the application should explain their use before collecting them. No public feed or AI-training consent is implemented by this backend.
