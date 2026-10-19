# Security and threat model

## Trust boundaries

The browser/native app, network input, object names, declared MIME/size, and all JWT claims supplied outside the verified Supabase session are untrusted. Postgres, Storage, and deployed Edge Functions are trusted only when configured from committed migrations and environment secrets.

## Controls

- RLS is enabled on every exposed application table. Authenticated policies use cached `(select auth.uid())` checks and separate operations; updates have both `USING` and `WITH CHECK`.
- Anonymous users receive only `SELECT` on active countries. Explicit grants avoid accidental Data API exposure.
- Composite ownership foreign keys prevent attaching media, places, or companions to another user's trip.
- The auth bootstrap function lives in an unexposed private schema, is narrowly scoped, has an empty fixed search path, and has execution revoked.
- Storage buckets are private. Upload policy accepts only the unpredictable path generated for one pending memory owned by the caller. There are no client update/delete policies, so arbitrary upload and upsert are disabled. `user-exports` has no client object policies at all.
- Edge Functions derive identity from a verified token and use service privileges only after an RLS ownership lookup.
- Export/deletion job tables are client-readable only through owner RLS; all writes are server-only. Internal cleanup endpoints accept the current Supabase server secret and explicitly reject publishable keys.
- Signed URLs are short lived. Secrets and privileged keys are excluded from client configuration and logs.

## Threats and responses

| Threat | Primary mitigation | Residual risk |
| --- | --- | --- |
| User A reads or mutates User B data | Table grants, RLS, composite FKs, integration tests | Hosted configuration drift must be monitored |
| Arbitrary/private object upload | Generated paths, pending-memory lookup, bucket MIME/size limits, no upsert | Storage metadata cannot prove image bytes are genuinely decoded |
| EXIF/GPS disclosure | Client re-encoding requirement and default privacy preference | Server cannot independently verify metadata stripping on the free-tier path |
| Orphan media after deletion | Media-first memory/trip/account functions plus abandoned-upload cleanup | Scheduler outages can delay cleanup |
| Cross-user export access | Owner RLS, server-only bucket, trusted signed-download check, expiry | Leaked signed URLs work until their ten-minute expiry |
| Incomplete account deletion | Durable request gate, media-first order, safe retries, Auth deletion last | Very large accounts may require repeated/batched worker design |
| Privileged function abuse | JWT verification, recent-auth deletion, owner lookup, strict bodies, no accepted `user_id` | Durable distributed rate limits are deferred |
| Sensitive URL/log leakage | Ten-minute URLs, never stored, privacy-safe function logs | Client telemetry must follow the same rule |
| SQL privilege regression | Explicit grants, pgTAP isolation tests, Supabase advisors | New migrations still require review |

## Operational requirements before hosting

Use separate development/staging/production projects; link only from a secure operator machine. Store provider, SMTP, database, legacy service-role, and current server secret keys in Supabase/project secret stores. Never use either privileged key in Vite or the SwiftUI client. Enable production SMTP, CAPTCHA or equivalent abuse controls, leaked-password protection where available, backups, log retention, and alerting. Run advisors after every migration and verify policies in staging before production.

Schedule `cleanup-expired-exports` and `cleanup-abandoned-uploads` with a trusted server-secret caller. Alert on `EXPORT_FAILED`, `DELETE_FAILED`, storage failures, repeated cleanup backlog, unusual auth failures, and advisor regressions. Rotate a suspected key immediately, review function/database logs for safe operation codes, and retest User A/User B isolation before restoring normal operation.
