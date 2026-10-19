# Threat model

Golden Atlas protects private travel history, journals, exact optional locations, images, exports, identity/session state, and privileged API keys. Likely actors are another authenticated user, an anonymous internet client, a token thief, malicious automation, a compromised dependency/operator credential, or accidental configuration drift.

| Threat and entry point | Preventive controls | Detection and recovery | Residual risk |
| --- | --- | --- | --- |
| IDOR/BOLA through guessed trip, memory, or job UUIDs | Owner RLS, composite owner FKs, RLS-scoped lookup before admin work | User A/User B integration tests; advisor monitoring | A future untested policy could regress |
| Forged `user_id` or editable metadata | Functions never accept identity; inserts default to verified `auth.uid()`; no `user_metadata` authorization | Malicious-body tests and RLS tests | Token theft still impersonates its owner until expiry |
| Public-bucket or arbitrary-path exposure | All media/export buckets private; exact registered memory paths; no export object policy; random UUID paths | Anonymous/cross-user storage tests; bucket/config review | A leaked signed URL works briefly |
| OAuth redirect or callback abuse | Exact redirect allow-list, state/nonce requirements, hosted provider checklist | Provider/auth anomaly monitoring | Hosted credentials and native callbacks need separate validation |
| Refresh/access token misuse | Refresh rotation, short access-token lifetime, recent-auth deletion | Auth anomaly alerts; global sign-out/key rotation | Access JWTs cannot be revoked cryptographically before expiry |
| Malicious/oversized upload or storage exhaustion | JPEG/PNG allow-list, 15 MiB/512 KiB bucket limits, declared/stored metadata match, no upsert | Finalization failures, cleanup backlog/storage alerts | Backend does not decode content or enforce aggregate quota yet |
| EXIF/GPS or exact-coordinate leakage | Client re-encoding requirement; GPS removal default; coordinates optional and paired | Privacy QA and client tests | Free-tier backend cannot prove EXIF stripping |
| Signed URL/path leakage through logs | Ten-minute URLs, never persisted, privacy-safe structured logs | Log review and secret scanning | Client crash tools must follow the same restriction |
| Cross-user or stale export access | RLS-scoped generation, server-only bucket, owner check, 24-hour expiry, cleanup worker | Export isolation/expiry tests and backlog alert | Scheduler outage can retain inaccessible objects longer |
| Incomplete/replayed deletion | Durable deletion gate, storage-first ordering, Auth deletion last, idempotent missing-object behavior | Failure codes and retry-count monitoring | Very large accounts may exceed one invocation and need a durable queue |
| Orphaned media | Media-first deletes and 24-hour abandoned-upload worker | Storage failure alerts and cleanup metrics | Objects with lost metadata need an operator reconciliation tool |
| SQL injection/XSS in private text | No dynamic SQL, length constraints, parameterized Data API | Database tests; client output encoding | Private script text can still harm a client that renders unsafely |
| Service/server secret or dependency compromise | Secrets only in trusted runtime; pinned function dependencies and CLI; least grants | Dependency scanning, secret rotation, audit logs | Supply-chain and operator compromise cannot be eliminated |
| Race/duplicate requests and automation | Partial unique active export, idempotent deletion, bounded batches, Auth rate limits | Retry/error metrics | Distributed durable rate limits and per-user storage quotas remain |

Incident response: rotate affected keys/provider credentials, disable the impacted function/provider, preserve privacy-safe operational logs, assess bucket/table exposure, run advisors and cross-user tests, repair from reviewed migrations, notify affected users where policy/legal review requires, and document residual data in backups.
