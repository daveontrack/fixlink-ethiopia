-- =====================================================================
-- FixLink Ethiopia - 014: lock down table privileges
-- =====================================================================
-- Supabase grants ALL privileges on every table in the `public` schema
-- to `anon` and `authenticated` by default (via default privileges).
-- The migrations revoke INSERT/UPDATE/DELETE where writes must go through
-- a SECURITY DEFINER function, but that leaves three problems:
--
--   1. The two transition matrices had NO Row Level Security policy and
--      NO revoke, so an anonymous client could read AND rewrite the
--      authoritative state machine of the whole platform.
--
--   2. TRUNCATE, REFERENCES and TRIGGER bypass Row Level Security
--      completely: a policy can never stop `TRUNCATE profiles`.
--
--   3. `anon` kept SELECT on private tables. RLS hides the rows, but the
--      privilege should not be there in the first place.
--
-- This migration closes all three.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. The transition matrices are database-owned reference data
-- ---------------------------------------------------------------------
-- Only the SECURITY DEFINER functions read them (transition_job /
-- transition_booking). Nobody may write them, ever.
revoke all on public.job_transition_rules from anon, authenticated;
grant select on public.job_transition_rules to authenticated;

revoke all on public.booking_transition_rules from anon, authenticated;
grant select on public.booking_transition_rules to authenticated;

-- ---------------------------------------------------------------------
-- 2. Privileges that are not covered by Row Level Security
-- ---------------------------------------------------------------------
revoke truncate, references, trigger
  on all tables in schema public
  from anon, authenticated;

-- ---------------------------------------------------------------------
-- 3. `anon` must not be able to read private tables at all
-- ---------------------------------------------------------------------
-- Public catalogue data (service categories, approved professional
-- profiles, their services and areas, and public reviews) keeps its
-- `anon` access on purpose.
revoke select on table
  public.profiles,
  public.professional_services,
  public.service_areas,
  public.audit_log,
  public.verification_documents,
  public.notifications,
  public.device_tokens,
  public.push_outbox,
  public.job_requests,
  public.job_photos,
  public.job_status_events,
  public.job_matches,
  public.matching_queue,
  public.quotations,
  public.bookings,
  public.messages,
  public.reports,
  public.idempotency_keys
  from anon;

-- The same tables are still readable by a signed-in user; the RLS
-- policies decide which rows.
grant select on table
  public.profiles,
  public.professional_services,
  public.service_areas,
  public.audit_log,
  public.verification_documents,
  public.notifications,
  public.device_tokens,
  public.job_requests,
  public.job_photos,
  public.job_status_events,
  public.job_matches,
  public.quotations,
  public.bookings,
  public.messages,
  public.reports
  to authenticated;

-- The outbox and the idempotency table are service-role only: they are
-- written by the push edge function and by trusted server routes.
revoke all on public.push_outbox from anon, authenticated;
revoke all on public.idempotency_keys from anon, authenticated;

-- ---------------------------------------------------------------------
-- 4. Belt and braces: the transition matrices are not user tables
-- ---------------------------------------------------------------------
alter table public.job_transition_rules enable row level security;
alter table public.booking_transition_rules enable row level security;

drop policy if exists "job_transition_rules_read_authenticated"
  on public.job_transition_rules;
create policy "job_transition_rules_read_authenticated"
  on public.job_transition_rules
  for select
  to authenticated
  using (true);

drop policy if exists "booking_transition_rules_read_authenticated"
  on public.booking_transition_rules;
create policy "booking_transition_rules_read_authenticated"
  on public.booking_transition_rules
  for select
  to authenticated
  using (true);
