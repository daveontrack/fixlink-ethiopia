# Release readiness — 2026-10-23

Environment inspected: Supabase project `zdgoomjevvvggsufanpi` (ACTIVE_HEALTHY,
ap-south-1), the repository's `.env`, and the local Node 24 toolchain.

## Checks actually run

| Check | Command | Result |
|---|---|---|
| Type-check | `npx tsc --noEmit` (apps/web) | **Pass**, 0 errors |
| Production build | `npx next build` | **Pass**, exit 0 |
| Unit/integration tests | `npx vitest run` | **Pass**, 46 passed, 1 skipped (8 files) |
| RLS against live project | included above (`rls-access.test.ts`) | **Pass**, 6 anonymous-access checks |
| Dependency audit | `npm audit --omit=dev` | **Pass**, 0 vulnerabilities |
| Secret scan | grep of `apps/web/src` | **Pass**, service-role key only in `lib/supabase/admin.ts` |

Test coverage added:

- authentication guards and role authorization (`auth-auth-tests.test.ts`)
- customer request validation and RPC creation (`customer-workflow-tests.test.ts`)
- professional quotation rules, approval gate and money mapping
  (`quotations-service.test.ts`)
- booking acceptance ownership/state (`booking-integrity.test.ts`)
- verification upload, private path, resubmission and audited admin decision
  (`verification-workflow.test.ts`)
- matching configuration ranges (`matching-config.test.ts`)
- database-driven location list (`sub-cities.test.ts`)
- signed-out RLS on profiles, requests, verification documents, matching config
  and the private bucket (`rls-access.test.ts`)

## What was fixed

1. **Production build.** The sign-in page imported `@clerk/nextjs/server` from a
   client component ("`server-only` cannot be imported from a Client Component")
   and the admin matching-config page used `useState`/`await` in a non-async
   server function. Both were rewritten; the matching page is now a server page
   plus a validated client form.
2. **Verification workflow.** The actions referenced tables that do not exist
   (`professional_documents`, `professional_profiles`) and stored a *public URL*
   for a **private** bucket. They now upload through a server action to
   `<professionalId>/<uuid>.<ext>`, store only the path in
   `verification_documents`, reset a rejected professional to `pending` on
   resubmission, and approve/reject through the audited
   `set_verification_status()` RPC. The admin page also listed the
   approved-only `professional_locations` view, so pending cases never
   appeared; it now reads the professional rows and opens documents through
   five-minute signed URLs.
3. **Quotation contract.** `createQuotation` returned an error object where the
   signature promised `Quotation | null`, and the action ignored it. It now
   returns a discriminated result and the action surfaces the verification
   message.
4. **Type errors** in the professional dashboard, request list, matching form
   and legacy seed script were corrected so the type-check and build gates pass.
5. **Tests** were placeholders (and two files failed to import). They were
   replaced with the suite above.

## Verified against the live project

- RLS is enabled on **every** `public` table (query returned no exceptions).
- `verification-documents` bucket is **private**, 10 MB, JPG/PNG/PDF; its three
  storage policies exist; an anonymous client cannot list it.
- `set_verification_status`, `accept_quotation` and `create_job_request` exist.
- A pending professional ("Gutu Demo") and two document rows point at
  `<professionalId>/<uuid>.png`, matching the storage policy. **The bucket
  contains no objects**, so opening a real file could not be verified; the UI
  correctly shows "File unavailable".
- Bookings: 3 rows, 3 distinct jobs; a partial unique index
  (`bookings_one_active_per_job`) and the atomic `accept_quotation()` function
  enforce one live booking per request.

## Blocked / not run

1. **Dire Dawa kebele migration and import — BLOCKED.**
   `20261023000100_sub_city_verified_kebeles.sql` was not applied: the
   available `SUPABASE_ACCESS_TOKEN` is read-only (`default_transaction_read_only = on`),
   so the Management API rejects DDL. `sub_cities` still has the original nine
   rows and none of the new columns. The import script correctly refuses to run:
   `column sub_cities.is_active does not exist`. Apply the file in the Supabase
   SQL editor, then run
   `node apps/web/src/scripts/import-dire-dawa-kebeles.js`.
2. **Matching worker not deployed.** No Edge Functions are deployed and
   `pg_cron`/`pg_net` are not installed. `matching_queue` is not drained in the
   live project.
3. **Push notifications.** There is no push worker by design (web-only); only
   in-app notifications exist. This is documented, not a regression.
4. **Database test suite (pgTAP).** `supabase/tests/*.sql` was not run: it
   needs a direct database connection string, which is not available. The
   repository also lacks the `db:test` npm script referenced by its README.
5. **Browser E2E / signed-in walkthrough.** Clerk authentication is required;
   no real session was available, so the admin and professional screens were
   verified by code, unit tests and database inspection only.
6. **Non-blocking build warning:** Next.js 16 deprecates `middleware.ts` in
   favour of `proxy.ts`. The build succeeds; plan the rename.

## Decision

**Not ready for production.**

**Not yet ready for staging** either: two P0 items define the marketplace's
core behaviour and are still unverified in the target environment — the
location data (kebeles) and the matching worker. The app itself builds, type-checks
and passes its tests, so staging can start as soon as those two are completed:

1. Apply `20261023000100_sub_city_verified_kebeles.sql`, run the import, and
   confirm 9 verified + 9 legacy (inactive) rows with valid foreign keys.
2. Deploy `matching-worker`, install `pg_cron`/`pg_net`, schedule it every
   minute, and confirm a test request moves through `matching_queue` to
   `job_matches`.
3. Then run the pgTAP suite and a signed-in E2E pass of request → quotation →
   booking and document upload → approve/reject → resubmit.
