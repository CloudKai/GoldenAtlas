# Golden Atlas

Golden Atlas is a private visual travel-diary prototype with a local-first Supabase backend. The current Vite interface remains a design reference and still uses mock data; it is not yet connected to Supabase.

## Prerequisites

- Node.js 22 (`nvm use` reads `.nvmrc`)
- pnpm 11.7.0
- Docker Desktop

If your shell still reports Node 20 after changing directories, run `nvm use` first. You can also use `./pnpmw` instead of `pnpm`; it selects the pinned Node version from `.nvmrc` when it is installed under nvm.

## Local development

```bash
./pnpmw install --frozen-lockfile
./pnpmw backend:start
./pnpmw dev
```

Supabase Studio is available at `http://127.0.0.1:54323` and captured local verification mail at `http://127.0.0.1:54324`. Copy `.env.example` to `.env` only when client integration begins, then obtain local public credentials with `pnpm exec supabase status`. Never expose the service-role key to a client.

Useful commands:

```bash
./pnpmw backend:reset
./pnpmw backend:test:db
./pnpmw backend:test:integration
./pnpmw backend:types
./pnpmw backend:verify
./pnpmw backend:stop
```

Create and inspect migrations/functions with the pinned CLI:

```bash
./pnpmw exec supabase migration new descriptive_name
./pnpmw exec supabase migration list --local
./pnpmw exec supabase functions new --auth user function-name
./pnpmw exec supabase functions serve
./pnpmw exec supabase db advisors --local --type all --level warn --fail-on error
```

`./pnpmw backend:verify` starts the stack, resets and seeds it twice, runs database and API integration tests, checks generated-type drift, runs Supabase advisors, and builds the Vite prototype.

Trusted scheduled operations are `cleanup-expired-exports` and `cleanup-abandoned-uploads`. Invoke them only from a server-side scheduler with the current Supabase `SECRET_KEY` (never a browser/Expo client). They return `has_more`; call again until it is false. Hosted linking, function deployment, scheduling, SMTP, Google, and Apple credentials are external dashboard/release steps documented below.

After staging review, the verified hosted workflow is:

```bash
./pnpmw exec supabase link --project-ref YOUR_PROJECT_REF
./pnpmw exec supabase db push --linked --include-seed --dry-run
./pnpmw exec supabase db push --linked --include-seed
./pnpmw exec supabase functions deploy
./pnpmw exec supabase migration list --linked
./pnpmw exec supabase db advisors --linked --type all --level warn --fail-on error
```

Do not automate production deployment from the verification workflow. Configure hosted Auth URLs/providers, scheduler secret calls, SMTP, backups, and alerts before release.

## Documentation

- [Backend architecture](docs/BACKEND_ARCHITECTURE.md)
- [Database model](docs/DATABASE.md)
- [API contracts](docs/API_CONTRACTS.md)
- [Security and threat model](docs/SECURITY.md)
- [Detailed threat model](docs/THREAT_MODEL.md)
- [Privacy and media data flow](docs/PRIVACY_DATA_FLOW.md)
- [Backup and recovery assumptions](docs/BACKUP_RECOVERY.md)
- [Hosted authentication setup](docs/HOSTED_AUTH.md)

Country and territory reference data is derived from GeoNames under CC BY 4.0; see [data attribution](supabase/data/README.md).
# GoldenAtlas
