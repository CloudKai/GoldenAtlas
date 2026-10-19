# Golden Atlas for iOS

Native SwiftUI client for the existing Golden Atlas Supabase backend. The web
prototype remains at the repository root and is not embedded in this app.

## Requirements

- Current stable Xcode with the iOS 17 SDK or newer
- An Apple ID for a connected-device development profile
- The local Supabase stack for simulator development, or a hosted staging project

## Configure

Copy the appropriate override template and fill in a project URL and **publishable**
key. The checked-in wrapper automatically includes the override when present.
Never put a secret/service-role key in an iOS configuration.

```bash
cp ios/GoldenAtlas/Config/Debug-Staging.xcconfig.example ios/GoldenAtlas/Config/StagingOverrides.xcconfig
cp ios/GoldenAtlas/Config/Release.xcconfig.example ios/GoldenAtlas/Config/ReleaseOverrides.xcconfig
```

`Debug-Local` is preconfigured for the simulator at `127.0.0.1`; create
`LocalOverrides.xcconfig` only when those defaults need changing. Use a hosted
HTTPS Supabase project for a physical phone. The app refuses to start if a
placeholder key is still present.

## Run

1. Install/select Xcode and open `GoldenAtlas.xcodeproj`.
2. Let Swift Package Manager resolve the pinned Supabase dependency.
3. Select `GoldenAtlas-Local` for the simulator or `GoldenAtlas-Staging` for a phone.
4. Start the backend from the repository root with `./pnpmw backend:start` for local work.
5. Build and run.

The local confirmation mailbox is at `http://127.0.0.1:54324`. Confirmation and
password-reset links use `goldenatlas://auth/callback` and
`goldenatlas://reset-password`.

## Regenerate database types

With the local backend running:

```bash
./pnpmw backend:types:swift
```

Do not edit `Database.generated.swift` manually.
