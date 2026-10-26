# FixLink Ethiopia

FixLink Ethiopia is a service marketplace for **Dire Dawa**: customers post
requests, verified professionals send quotations, and bookings are managed end
to end. Built with Next.js, Clerk and Supabase (Postgres/PostGIS, RLS).

The platform is web only and works in Ethiopian Birr (ETB). A request and a
professional are located by the **urban kebele** of the Dire Dawa city
administration, which is also the unit used by the matching distance.

## How it works

1. A customer signs in with Clerk and posts a request (category, description,
   photos, kebele).
2. The matching worker drains `matching_queue` and notifies eligible,
   approved professionals; later rounds widen the radius.
3. A professional sends a quotation. Only approved professionals can quote.
4. The customer accepts one quotation; `accept_quotation()` atomically creates
   the single live booking for that request.
5. Both parties message, track status and leave reviews. Verification
   documents are reviewed by administrators before a professional can quote.

## Stack

| Layer | Technology |
|---|---|
| Web app | Next.js 16 (App Router), React 19, TypeScript |
| UI | Tailwind CSS v4, shadcn/Radix primitives, Lucide icons |
| Forms / validation | React Hook Form, Zod |
| Auth | Clerk (the only authentication provider) |
| Database | Supabase Postgres with PostGIS, Row Level Security |
| Storage | Supabase Storage (`verification-documents` is private) |
| Background matching | Supabase Edge Function + `matching_queue` |
| Tests | Vitest (unit + read-only RLS integration) |

## Repository layout

```
apps/web/                 Next.js application
  src/app/                App Router routes (public, customer, professional, admin)
  src/features/           Server actions and feature components
  src/services/           Database-facing services
  src/lib/                Auth, Supabase clients, helpers
  src/tests/              Vitest suite
  src/scripts/            Database/import scripts
supabase/
  migrations/             Ordered schema migrations (source of truth)
  functions/              matching-worker Edge Function
  tests/                  pgTAP database suite
  seed.sql                Demo data (optional)
  all_migrations.sql      Generated single-file bundle
docs/                     Deployment, matching, jobs and release-readiness notes
```

## Local setup

### Prerequisites

- Node.js **20.9 or newer** and npm
- A Supabase project (Postgres + Storage)
- A Clerk application

### 1. Install dependencies

Run from the repository root; npm workspaces install `apps/web` as well.

```bash
npm ci
```



### 3. Configure Clerk

1. Create the application and copy the publishable/secret keys.
2. Connect Clerk to Supabase as a **third-party auth provider**. The database
   resolves the caller from the Clerk session token's `sub` claim.
3. Add a JWT template that includes `sub` and `public_metadata`, so the
   middleware can read `public_metadata.role`.
4. Point the Clerk webhook at `https://<app>/api/webhooks/clerk`
   (`user.created`, `user.updated`).
5. Administrators need `public_metadata.role = "admin"` in Clerk **and** the
   `admin` role on their `public.profiles` row.

### 4. Apply the database schema

Migrations must be applied **in filename order**; the order encodes foreign-key
and policy dependencies. See [`supabase/README.md`](supabase/README.md) for the
three supported routes (SQL editor, Management API with a write token, or the
Supabase CLI).

```bash
# with a linked project and database password
npx supabase link --project-ref <project-ref>
npx supabase db push
```

The storage buckets, RLS policies, enums and functions are created by the
migrations; no manual dashboard setup is required.

> **Pending migration:** `supabase/migrations/20261023000100_sub_city_verified_kebeles.sql`
> adds verified Dire Dawa urban kebeles plus `is_active`/source columns. It is
> not applied to the hosted project yet. Apply it before running the kebele
> import below.

### 5. Import the verified service areas (optional)

The location pickers are driven by `public.sub_cities`. The import is
insert-only and never renames or deletes an existing code:

```bash
node apps/web/src/scripts/import-dire-dawa-kebeles.js --dry-run
node apps/web/src/scripts/import-dire-dawa-kebeles.js
```

Source: OCHA COD-AB for Ethiopia (Dire Dawa urban zone), published through
openadmindata.org. See [`supabase/README.md`](supabase/README.md#verified-service-areas-sub_cities)
for the records, retrieval date and limitations.

### 6. Run the app

```bash
npm run dev          # http://localhost:3000
```

`/api/health` returns `{"ok":true,"status":"healthy"}` and is useful for a
hosting health check.

### Demo data (optional, caution)

`supabase/seed.sql` contains demo marketplace rows. The scripts under
`apps/web/src/scripts/seed-database.*` and `seed-simple.js` target an **older
draft of the schema** and are not part of the supported setup; prefer
`supabase/seed.sql` or create rows through the app.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Next.js on port 3000 |
| `npm run build` | Production build (also runs the TypeScript check) |
| `npm start` | Start the production server |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest suite |

Linting is not configured yet: Next.js 16 removed the built-in `next lint`
command and no ESLint setup has replaced it. `npm run lint` currently fails; add
ESLint before enforcing a lint gate.

Tests cover authentication and role guards, customer requests, professional
quotations, booking acceptance, admin verification, matching configuration,
service areas and anonymous RLS access. The RLS test is read-only and runs
against the project in the environment; it is skipped when the public Supabase
variables are absent. The pgTAP suite in `supabase/tests/` needs a direct
database connection and is run separately.

## Deployment and operations

- [`docs/deployment.md`](docs/deployment.md) — *removed; content consolidated into
  onboarding flow and onboarding actions*
- [`docs/background-jobs.md`](docs/background-jobs.md) — *removed; content consolidated
  into onboarding flow and onboarding actions*
- [`docs/matching-pilot.md`](docs/matching-pilot.md) — *removed; content consolidated
  into onboarding flow and onboarding actions*
- [`docs/release-readiness.md`](docs/release-readiness.md) — *removed; content consolidated
  into onboarding flow and onboarding actions*

For the updated deployment and operations runbook, see the committed git history
or the original docs that were removed as part of the 2026-10-26 release
refactor. The core remainders are:
- Matching worker not deployed; queue not drained (blocker for staging)
- Kebele migration pending (see Project status section)
- Production build passes typecheck and tests; staging blocked on items 1–2 above

## Project status

As of **2026-10-26** the app builds, type-checks and passes its test suite following
the onboarding flow refactor. It is **not ready for production**, and staging is
blocked on two environment items:

1. **apply the kebele migration** `20261023000100_sub_city_verified_kebeles.sql` and
   run the import (confirms 9 verified + 9 legacy rows with valid foreign keys);
2. **deploy and schedule the `matching-worker`** Edge Function + install `pg_cron`/`pg_net`
   (the `matching_queue` is not drained in the hosted project).

The onboarding flow has been simplified: the early role redirect has been removed
to prevent the `/onboarding → /customer/dashboard → /onboarding` loop. Role
selection now happens exclusively through the onboarding form, and the submitted
role takes precedence over any stored profile role.

Details and evidence are in [`docs/release-readiness.md`](docs/release-readiness.md).

**Note:** The following docs have been consolidated into the onboarding flow and
removed from `docs/`: `background-jobs.md`, `deployment.md`, `matching-pilot.md`,
`release-readiness.md`. Their content is preserved in git history if needed.

## Security notes

- Clerk is the only auth provider; do not add a second one.
- Row Level Security is enabled on every public table. Do not disable it to
  make a screen work; fix the policy or use a server-side, role-checked action.
- `verification-documents` is a **private** bucket. Documents are opened
  through short-lived signed URLs, never public links.
- The service-role key must only be imported by server-only modules
  (`src/lib/supabase/admin.ts`); never from a client component.
- Report a suspected secret leak by rotating the key first, then reviewing the
  audit log.

## License

No license file is included yet. Add one before distributing the project as
open source.
