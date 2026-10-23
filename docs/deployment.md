# Deployment and operations

This is the release runbook for the FixLink Ethiopia web app and its Supabase
project. It describes what must be true before staging and how to deploy,
back up, roll back and recover.

## 1. Components

| Component | Where |
|---|---|
| Web app (Next.js 16, React 19) | `apps/web`, built from the repository root |
| Authentication | Clerk (the only provider) |
| Database, storage, realtime | Supabase project `zdgoomjevvvggsufanpi` (ap-south-1) |
| Matching worker | Supabase Edge Function, not deployed yet (see `background-jobs.md`) |

Supported runtime: Node.js >= 20.9.

## 2. Environment variables

All values live in one `.env` at the repository root for local work and in the
hosting provider's environment settings for staging/production. **Only the
`NEXT_PUBLIC_*` values may appear in the client bundle.**

| Variable | Scope | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | public | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | public | anon/publishable key, used by browser and RLS-bound server clients |
| `SUPABASE_SERVICE_ROLE_KEY` | server only | admin client; bypasses RLS. Never import it in a client component |
| `SUPABASE_ACCESS_TOKEN` | developer machine | Management API token for migrations/automation. Use a token with `database:write` for DDL |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | public | Clerk frontend key |
| `CLERK_SECRET_KEY` | server only | Clerk backend key; also used to verify webhooks |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` / `SIGN_UP_URL` / redirect URLs | public | Clerk routing |
| `NEXT_PUBLIC_APP_URL` | public | canonical URL used in links |
| `NEXT_PUBLIC_MAP_TILE_URL` | public | map tiles |
| `RESEND_API_KEY` / `RESEND_FROM_EMAIL` | server only | optional e-mail delivery |

Rules:

- The service-role key is never sent to the browser and never committed.
- `.env`/`.env.local` stay out of version control (they are already ignored).
- Rotate a key immediately if it appears in a build log or a client bundle.

## 3. External service setup

### Clerk

1. Create the application; use the production instance for staging/production.
2. Configure **Supabase third-party auth** with Clerk: the Supabase project
   must trust Clerk's session tokens. The database reads the Clerk user id
   from the `sub` claim (`20261020002500_clerk_identity.sql`).
3. Add a JWT template that includes `sub` and `public_metadata`, so the
   middleware can read `public_metadata.role`.
4. Point the Clerk webhook at `https://<app>/api/webhooks/clerk`
   (`user.created`, `user.updated`) so profiles are synchronised. The route
   verifies the signature with `CLERK_SECRET_KEY`.
5. Administrators need `public_metadata.role = "admin"` in Clerk **and** the
   `admin` role on their `profiles` row. Both are checked (middleware and
   `requireAdmin`).

### Supabase

- Storage buckets (created by the migrations): `job-photos` (private),
  `avatars` (public), `verification-documents` (**private**, 10 MB, JPG/PNG/PDF).
- Realtime publication, RLS and grants are in the migrations; do not disable
  RLS to make a screen work.
- Verify the private bucket after every environment setup:

```sql
select id, public, file_size_limit from storage.buckets
 where id in ('job-photos', 'avatars', 'verification-documents');
```

## 4. Build and release

```powershell
npm ci
npm run typecheck   # tsc --noEmit
npm test            # vitest run
npm run build       # next build
npm start           # production server on :3000
```

Gate: do not deploy when typecheck, tests or build fail. The current status is
recorded in `docs/release-readiness.md`.

Hosting (Vercel or any Node host):

- Root directory: repository root; build command `npm run build`; output is
  the Next.js standalone server from `apps/web`.
- Set every environment variable for the target environment; never reuse the
  production service-role key in staging.
- Health check: `GET /api/health` returns `{"ok":true,"status":"healthy"}`.

## 5. Database migrations

The schema is the ordered set of files in `supabase/migrations/`. Apply them
in filename order; the order is the dependency graph.

Three ways to apply:

1. **Supabase SQL editor** — run each file in order, or the generated bundle
   `supabase/all_migrations.sql`. This is the only route that works with a
   read-only `SUPABASE_ACCESS_TOKEN`.
2. **Management API** — `POST /v1/projects/{ref}/database/query` with a token
   that has `database:write`. A read-only token fails with
   `cannot execute ALTER TABLE in a read-only transaction`.
3. **Supabase CLI** — `npx supabase link --project-ref <ref>` then
   `npx supabase db push` (needs the database password).

Rules:

- Never edit an applied migration; add a new file with a later timestamp.
- Record the version in `supabase_migrations.schema_migrations` when applying
  manually, so a later `db push` does not re-run it.
- The release adds `20261023000100_sub_city_verified_kebeles.sql`. **It has not
  been applied to the live project** (the available access token is read-only).
  Until it is applied, the verified-kebele import cannot run and the location
  pickers keep their current nine rows.

After that migration is applied, run the import:

```powershell
node apps/web/src/scripts/import-dire-dawa-kebeles.js --dry-run
node apps/web/src/scripts/import-dire-dawa-kebeles.js
```

The script inserts only; existing codes and names are reused untouched.

## 6. Backup

- Enable Supabase **daily backups** at minimum; point-in-time recovery (PITR)
  for a pilot with real customer data.
- Before a migration or import, take an on-demand backup or snapshot.
- Manual logical backup (needs the database password, never commit it):

```powershell
pg_dump "postgresql://postgres.<ref>:<password>@aws-0-ap-south-1.pooler.supabase.com:5432/postgres" `
  --format=custom --file=fixlink-$(Get-Date -Format yyyyMMdd).dump
```

- Storage objects (verification documents, job photos) are **not** in a
  database dump. Back them up separately with the Storage API if they become
  business-critical.
- Test a restore quarterly; an untested backup is a hope, not a backup.

## 7. Rollback

The app and the database roll back differently.

**Application** — redeploy the previous known-good build (Vercel: promote the
previous deployment). No migration is required.

**Database** — migrations are forward-only; there are no down files.

- For a bad *data* change (for example the kebele import), revert the rows with
  a targeted statement; never truncate the table. The import is insert-only, so
  removal is limited to the nine new codes and must respect the foreign keys
  (`job_requests`, `professionals`).
- For a bad *schema* change, deploy a new forward migration that reverses it.
- For corruption or an accidental destructive statement, restore the last
  backup/PITR snapshot into a new project, validate, then switch the app's
  environment variables. Do not restore over the live project without an
  explicit decision and a maintenance window.

## 8. Monitoring

- Uptime: `GET /api/health`.
- Supabase Dashboard: database health, slow queries, storage usage, auth logs.
- Clerk Dashboard: sign-in failures, webhook delivery.
- Application errors: the app logs to stdout; connect the host's log drain.
  There is no error-tracking service configured yet — recommended before a
  public launch.
- Matching: `matching_queue` status and `job_matches` volume
  (see `background-jobs.md`). With the worker undeployed the queue only grows.
- Verification: pending professionals and documents at
  `/admin/verifications`; documents open through 5-minute signed URLs.

## 9. Recovery scenarios

| Scenario | Action |
|---|---|
| Web host down | Redeploy the last build; the database is unaffected. |
| Clerk outage | Sign-in is unavailable; public pages still render. Do not add a second auth provider. |
| Supabase outage | App shows errors; restore service or wait. No client-side cache of private data. |
| Service-role key leaked | Rotate it in Supabase, update the host and the Edge Function secret, then audit logs for writes. |
| Database corruption | Restore the newest PITR/backup into a clean project, run `select count(*)` sanity checks on `profiles`, `job_requests`, `bookings`, `sub_cities`, then repoint the app. |
| Bad migration | Forward-fix with a new migration; restore only if data is lost. |

## 10. Security checks before staging

```powershell
npm audit --omit=dev
npm run typecheck
npm test
```

Also confirm:

- No service-role key or Clerk secret in `apps/web/src` or the built client
  bundle (`grep -R "SUPABASE_SERVICE_ROLE_KEY" apps/web/src` should only match
  server files).
- RLS stays enabled on every table; signed-out visitors see only the public
  catalogue (`src/tests/rls-access.test.ts`).
- `verification-documents` bucket remains private.
