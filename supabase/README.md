# Supabase database

## Applying the migrations

The schema is built from the files in `migrations/`. They **must** be applied
in filename order — the order encodes the foreign-key and policy dependencies.

| # | File | Contents |
|---|------|----------|
| 1 | `20261020000000_extensions_and_enums.sql` | `pgcrypto`, `postgis`, all enums, `set_updated_at()` |
| 2 | `20261020000100_profiles_and_identity.sql` | `profiles`, the Supabase Auth identity helpers, `is_admin()`, `ensure_profile()`, the sign-up trigger |
| 2b | `20261020000250_sub_cities.sql` | `sub_cities` — the nine sub-cities of Dire Dawa |
| 3 | `20261020000300_professionals.sql` | `professionals`, `professional_services`, `service_areas` |
| 4 | `20261020000400_audit_log_and_verification_documents.sql` | `audit_log`, `verification_documents` |
| 5 | `20261020000500_notifications_and_push.sql` | `notifications`, `device_tokens`, `push_outbox`, `notify()` |
| 6 | `20261020000600_job_requests.sql` | `job_requests`, `job_photos`, `job_status_events`, transition matrix |
| 7 | `20261020000700_quotations_and_bookings.sql` | `quotations`, `bookings`, accept/transition functions |
| 8 | `20261020000800_matching.sql` | `matching_config`, `job_matches`, scoring formula |
| 9 | `20261020000900_messages.sql` | `messages` (private booking conversations) |
| 10 | `20261020001000_reviews_reports_admin.sql` | `reviews`, `reports`, admin functions |
| 11 | `20261020001100_realtime_grants_idempotency.sql` | Realtime publication, final grants |
| 12 | `20261020001200_storage_and_participant_policies.sql` | Storage buckets + cross-table RLS policies |
| 13 | `20261020001300_lock_down_privileges.sql` | Privilege hardening (see below) |
| 14 | `20261020001400_message_views.sql` | `view_participant_conversations`, `view_unread_message_counts` |
| 15 | `20261020001500_privilege_tightening_and_insert_guards.sql` | `anon` read-only, insert guards |
| 16 | `20261020001600_professional_locations_view.sql` | `professional_locations` (public directory) |
| 17 | `20261020001700_admin_professional_availability.sql` | `set_professional_availability()` |
| 18 | `20261020001800_fix_response_rate_trigger.sql` | The response-rate trigger fix |
| 19 | `20261020001900_notification_emailed_at.sql` | Tracks which notifications were e-mailed |
| 20 | `20261020002000_fix_rls_recursion.sql` | Breaks the `job_requests` ↔ `job_matches` policy recursion |
| 21 | `20261020002100_matching_queue_functions.sql` | The queue operations of the matching worker |
| 22 | `20261020002200_push_outbox_functions.sql` | The queue operations of the push dispatcher |
| 23 | `20261020002400_sub_city_columns_and_functions.sql` | The `sub_city_code` columns and the sub-city based create/edit functions |

### Identity

Supabase Auth is the single authentication system. The chain is:

```
supabase.auth.signUp()  ──▶  auth.users row
                              │  (the on_auth_user_created trigger)
                              ▼
                         public.profiles row
```

`profiles.id` is an independent UUID (every table references it), and
`profiles.auth_user_id` links the profile to `auth.users.id` —
deleting an auth account can never cascade-delete the marketplace
history.

The profile row is created by the `on_auth_user_created` trigger on
`auth.users`, and refreshed by `public.ensure_profile()`, a SECURITY
DEFINER function: it is the only supported way to create a profile, it is
idempotent (one account, one profile, whatever the number of sign-ins),
and it never lets the caller choose a role or an account status.

### Reading the data

Three read models are exposed as views:

* `view_participant_conversations` — the bookings the caller takes part in,
  with the last message, the other party and the service category.
* `view_unread_message_counts` — unread messages per booking.
* `professional_locations` — the public directory of **approved**
  professionals: coordinates, categories and rating. Readable without an
  account (`anon`), because it only exposes approved professionals.

The first two filter on `public.current_profile_id()` /
`public.current_professional_id()`, so a caller only ever sees their own
conversations.

### Three ways to apply them

1. **Management API (recommended, no DB password needed)**

   ```powershell
   $env:SUPABASE_ACCESS_TOKEN='sbp_...'   # https://supabase.com/dashboard/account/tokens
   npm run db:apply -- zdgoomjevvvggsufanpi
   ```

   The script applies every file in order and records the versions in
   `supabase_migrations.schema_migrations`, so `supabase db push` stays in
   sync afterwards.

2. **Supabase CLI** — `supabase link --project-ref zdgoomjevvvggsufanpi` (asks for
   the database password), then `supabase db push`.

3. **SQL editor** — run the files one by one in the order above, or paste the
   single combined script:

   ```powershell
   npm run db:bundle     # writes supabase/all_migrations.sql
   ```

### Why file 13 exists

PostgreSQL resolves relations at **create** time for foreign keys,
`ALTER TABLE`, `CREATE POLICY` expressions and `LANGUAGE sql` function
bodies. The marketplace data model is a chain:

```
job_requests -> job_matches -> quotations -> bookings
```

so the policies that decide "who may read this request" have to name
`job_matches` and `bookings`. Creating them in the file that owns the table
would fail with:

```
ERROR: 42P01: relation "public.job_matches" does not exist
```

The tables stay in their own migration files; only the policies that span
several tables (and the storage policies, which also join `job_requests`
and `job_matches`) are collected in file 13, which is applied last.

`PL/pgSQL` function bodies are *not* resolved at creation time — they are
compiled on first call — so a PL/pgSQL function may reference a table
created in a later file. A `LANGUAGE sql` function body **is** analysed
when the function is created, which is why the matching migration (file 9)
comes after the bookings migration (file 8).

### Why file 20 exists

Two policies referenced each other:

```
job_requests_select_participants  ->  reads job_matches
job_matches_select_participants  ->  reads job_requests
```

PostgreSQL evaluates a policy for every row, so reading a request made
it evaluate the policy on `job_matches`, which made it evaluate the
policy on `job_requests` again. PostgreSQL detects the cycle and aborts:

```
ERROR: infinite recursion detected in policy for relation "job_requests"
```

That broke every screen that lists requests, including the administrator
review screen. File 20 moves the cross-table lookups into `SECURITY
DEFINER` helpers (`can_view_job()`, `is_job_owner()`, `is_matched_to_job()`,
`has_professional_booking()`). A `SECURITY DEFINER` function owned by the
table owner reads a table **without** its Row Level Security policies, so
the cycle disappears.

The helpers are safe to expose: they take no identity from their
arguments — they always answer "may *this* caller see this job?", and the
caller comes from the JWT.

## Permissions

Supabase grants ALL privileges on every table in `public` to `anon` and
`authenticated` by default. Files 14 and 16 take that back:

* `anon` is read-only, and only on the public catalogue
  (`service_categories`, `professionals`, `professional_services`,
  `service_areas`, `reviews`).
* `TRUNCATE`, `REFERENCES` and `TRIGGER` are revoked everywhere — they
  bypass Row Level Security completely.
* The two transition matrices are readable but never writable: they are
  the authoritative state machine of the platform.
* Writes go through the SECURITY DEFINER functions
  (`create_job_request`, `submit_quotation`, `accept_quotation`,
  `send_message`, `create_review`, …), never through a direct insert.
* `professionals` rows can only be created by `start_as_professional()`,
  and an insert guard forces `verification_status = 'pending'` so nobody
  can hand themselves an approved profile.

## Checks

```powershell
npm run db:check
```

* `scripts/check-sql.mjs` — parses every migration with the real PostgreSQL
  parser (SQL + PL/pgSQL).
* `scripts/check-migration-order.mjs` — walks the migrations in apply order
  and fails if any statement references a table that does not exist yet.

## The database tests

`supabase/tests/` holds the pgTAP suite: the Row Level Security, the
SECURITY DEFINER functions, the constraints and the atomicity of the
booking acceptance.

```powershell
npm run db:test -- "postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres"
```

Every file ends with `rollback`, so the fixtures disappear with the
transaction and the real data is never touched. The runner also performs
a **concurrency** check that a pgTAP file cannot: two connections accept
two different quotations of the same job at the same instant, and exactly
one must win.

See [../docs/testing.md](../docs/testing.md) for the whole list.
