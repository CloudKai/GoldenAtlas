# Hosted authentication setup

Local email/password authentication is configured with required email verification, password reset, a ten-character letters-and-digits minimum, refresh-token rotation, and allow-listed `goldenatlas://` callback/reset links. Local email appears in Inbucket at `http://127.0.0.1:54324`.

The web app confirms email addresses at `/auth/callback` and resets passwords at `/auth/reset-password`, using the PKCE flow. Both exact URLs (for example `http://127.0.0.1:5173/auth/callback` locally, and your production origin when hosted) must be in the Auth redirect allow-list or Supabase falls back to the Site URL.

Before hosting:

1. Create and link a Supabase project, configure production Site URL and exact web/native redirect allow-list entries, then deploy migrations/functions.
2. Configure a production SMTP provider and branded confirmation/recovery templates. Test confirmation, recovery, expired link, changed email, and recent-login password change flows.
3. Keep the SwiftUI target's registered `goldenatlas` deep-link scheme and allow-list the exact `goldenatlas://auth/callback` and `goldenatlas://reset-password` URLs. The app exchanges callbacks through the pinned Supabase Swift PKCE client; test malformed, expired, and recovery callbacks before release.
4. In the Supabase dashboard, enable Google only after creating the correct web/iOS OAuth clients and registering Supabase's hosted callback URL with Google. Store client secrets only in provider/Supabase secret configuration.
5. Enable Apple only after creating the Apple Services ID, App ID entitlement, return URL, key, team ID, and rotating client secret. Test native Apple nonce handling and private-relay email behavior on a physical device.
6. Register `com.goldenatlas.ios`, configure Apple signing and associated domains before universal-link support, then test account recovery on a physical iPhone. Social-provider linking is deferred from the SwiftUI MVP.

Google and Apple are intentionally disabled locally. This repository documents their required configuration but does not claim hosted or native OAuth works without provider credentials and a deployed project.
