# API contracts

All Data API calls use the authenticated Supabase client. Clients never send `user_id` for normal inserts; database defaults derive it from the verified JWT. RLS makes an inaccessible row indistinguishable from a missing row.

## Direct Data API

- Read active `countries` anonymously or while authenticated.
- Select/update the caller's `profiles` and `user_preferences` row.
- Select/insert/update/delete owned `trips`.
- Select/insert/update owned `memories`; direct deletion is deliberately unavailable.
- Select/insert/update/delete owned companions, places, and bucket-list rows.
- Select the caller's row from `personal_statistics`.
- Select owned `data_export_jobs` and `account_deletion_requests` for status only; clients cannot write them.

Pagination should order by the relevant compound cursor and include the UUID as a tie-breaker. Clients should treat Postgres constraint and RLS failures as validation/authorization failures without exposing raw database details to users.

## `finalize-memory-upload`

`POST /functions/v1/finalize-memory-upload`

```json
{ "memory_id": "uuid" }
```

The verified caller must own a pending memory. The function confirms that both exact private objects exist and that their stored MIME types and sizes match the pending record and bucket limits. Success returns:

```json
{ "data": { "memory_id": "uuid", "upload_status": "ready" } }
```

Calling it again for a ready memory is idempotent. Invalid stored metadata is removed and the memory becomes `failed`. A missing object returns HTTP 409 with `UPLOAD_INCOMPLETE`.

## `delete-memory`

`POST /functions/v1/delete-memory`

```json
{ "memory_id": "uuid" }
```

The function deletes the original, then thumbnail, then metadata. Repeating the request after full or partial completion is safe. Success and an already-inaccessible/deleted record both return:

```json
{ "data": { "memory_id": "uuid", "deleted": true } }
```

## `delete-trip`

`POST /functions/v1/delete-trip`

```json
{ "trip_id": "uuid" }
```

The verified caller must own the trip. The function deletes every registered original and thumbnail before deleting memory and trip metadata. It is idempotent and does not reveal whether an inaccessible trip belongs to another user.

## `request-data-export`

`POST /functions/v1/request-data-export` with an empty JSON object. The function never accepts `user_id`. It reuses an active or unexpired job, otherwise generates an RLS-scoped JSON export up to 10 MiB. A new completed job returns HTTP 201; an existing processing job returns HTTP 202.

```json
{
  "data": {
    "id": "uuid",
    "status": "completed",
    "requested_at": "timestamptz",
    "completed_at": "timestamptz",
    "expires_at": "timestamptz"
  }
}
```

The file expires after 24 hours. It contains the user's structured application data and memory metadata, not image bytes.

## `get-export-download`

`POST /functions/v1/get-export-download`

```json
{ "export_job_id": "uuid" }
```

Only a completed, unexpired job owned by the caller can be signed. The response contains a 600-second URL; the URL must remain in memory and out of logs/analytics.

```json
{
  "data": {
    "export_job_id": "uuid",
    "signed_url": "short-lived URL",
    "expires_in_seconds": 600
  }
}
```

## `delete-account`

`POST /functions/v1/delete-account`

```json
{ "confirmation": "DELETE" }
```

The verified token must have been issued within 15 minutes. The function resumes any existing request, blocks new memories, cancels/removes exports, removes originals and thumbnails, then hard-deletes the Auth user. On a partial failure it returns `DELETE_FAILED` and retains minimum retry state. A successful response is:

```json
{ "data": { "deleted": true } }
```

## Internal cleanup operations

`cleanup-expired-exports` and `cleanup-abandoned-uploads` are POST-only scheduler endpoints. They require a current Supabase server secret, reject publishable keys, operate in batches of 100, and return `{ cleaned, has_more }`. They are not mobile-client APIs.

## Stable error envelope

```json
{ "error": { "code": "UPLOAD_INCOMPLETE", "message": "..." } }
```

Codes include `AUTH_REQUIRED`, `AUTH_RECENT_REQUIRED`, `NOT_AUTHORIZED`, `VALIDATION_FAILED`, `RESOURCE_NOT_FOUND`, `UPLOAD_INCOMPLETE`, `EXPORT_IN_PROGRESS`, `EXPORT_EXPIRED`, `EXPORT_TOO_LARGE`, `EXPORT_FAILED`, `DELETE_FAILED`, and `SERVICE_UNAVAILABLE`. Authentication failures may be handled by the Edge runtime before the handler. Functions accept no `user_id` and log no email, caption, place, object path, signed URL, or token.

## Signed media

Call `storage.from(bucket).createSignedUrl(path, 600)` with the authenticated client. Storage RLS validates ownership. Signed URLs expire after ten minutes, are never persisted, and must not be written to app logs or analytics.
