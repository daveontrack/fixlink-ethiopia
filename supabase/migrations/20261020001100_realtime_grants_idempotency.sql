-- =====================================================================
-- FixLink Ethiopia - 012: realtime, idempotency, final grants
-- =====================================================================
-- 1. `idempotency_keys` lets the trusted web API routes make important
--    create operations safe against accidental retries.
-- 2. The Realtime publication exposes only the tables the apps actually
--    subscribe to. RLS still applies to every subscription, so a
--    subscriber only receives rows it is allowed to read.
-- 3. Final grants: application roles get the minimum they need; every
--    privileged operation goes through a SECURITY DEFINER function.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Idempotency keys for trusted server endpoints
-- ---------------------------------------------------------------------
create table if not exists public.idempotency_keys (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  operation text not null,
  key text not null,
  response jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, operation, key)
);

create index if not exists idempotency_keys_created_idx
  on public.idempotency_keys (created_at);

alter table public.idempotency_keys enable row level security;
revoke all on public.idempotency_keys from anon, authenticated;

comment on table public.idempotency_keys is
  'Replay protection for trusted server endpoints. A repeated key returns the stored response.';

-- ---------------------------------------------------------------------
-- Realtime publication
-- ---------------------------------------------------------------------
-- `alter publication ... add table` fails if the table is already a
-- member, so guard each statement.
do $$
declare
  v_table text;
  v_tables text[] := array[
    'messages', 'notifications', 'job_matches', 'quotations',
    'bookings', 'job_requests'
  ];
begin
  if not exists (
    select 1 from pg_publication where pubname = 'supabase_realtime'
  ) then
    return;
  end if;

  foreach v_table in array v_tables
  loop
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = v_table
    ) then
      execute format(
        'alter publication supabase_realtime add table public.%I', v_table
      );
    end if;
  end loop;
end
$$;

-- ---------------------------------------------------------------------
-- Final grants
-- ---------------------------------------------------------------------
-- Read access for the application roles. Write access is granted per
-- table above and is deliberately narrow; sensitive writes happen only
-- inside SECURITY DEFINER functions.
grant usage on schema public to anon, authenticated;
grant select on public.profiles to authenticated;
grant select on public.service_categories to anon, authenticated;
grant select on public.professionals to anon, authenticated;
grant select on public.professional_services to anon, authenticated;
grant select on public.service_areas to anon, authenticated;
grant select on public.job_requests to authenticated;
grant select on public.job_photos to authenticated;
grant select on public.job_status_events to authenticated;
grant select on public.job_matches to authenticated;
grant select on public.quotations to authenticated;
grant select on public.bookings to authenticated;
grant select on public.messages to authenticated;
grant select on public.notifications to authenticated;
grant select on public.reviews to anon, authenticated;
grant select on public.reports to authenticated;
grant select on public.verification_documents to authenticated;
grant select on public.matching_config to authenticated;
grant select on public.audit_log to authenticated;

-- Every SECURITY DEFINER function is executable by the application roles.
grant execute on function public.ensure_profile(text, text, text) to authenticated;
grant execute on function public.start_as_professional(int, text) to authenticated;
grant execute on function public.update_professional_profile(
  text, int, boolean, numeric, text, double precision, double precision
) to authenticated;
grant execute on function public.set_professional_services(jsonb) to authenticated;
grant execute on function public.set_service_areas(text[]) to authenticated;
grant execute on function public.create_job_request(
  uuid, text, text, text, double precision, double precision,
  public.location_source, public.job_priority, text
) to authenticated;
grant execute on function public.update_job_request(
  uuid, text, text, text, double precision, double precision, public.job_priority
) to authenticated;
grant execute on function public.transition_job(uuid, public.job_status, text) to authenticated;
grant execute on function public.match_job(uuid, int, numeric, int) to authenticated;
grant execute on function public.request_matching(uuid, int) to authenticated;
grant execute on function public.expand_matching(uuid) to service_role;
grant execute on function public.submit_quotation(
  uuid, numeric, numeric, text, timestamptz, int
) to authenticated;
grant execute on function public.accept_quotation(uuid, timestamptz) to authenticated;
grant execute on function public.transition_booking(uuid, public.booking_status, text) to authenticated;
grant execute on function public.reschedule_booking(uuid, timestamptz, text) to authenticated;
grant execute on function public.send_message(uuid, text) to authenticated;
grant execute on function public.mark_messages_read(uuid) to authenticated;
grant execute on function public.mark_notifications_read(uuid[]) to authenticated;
grant execute on function public.register_device_token(text, public.device_platform) to authenticated;
grant execute on function public.create_review(uuid, integer, text) to authenticated;
grant execute on function public.create_report(uuid, uuid, public.report_reason, text) to authenticated;
grant execute on function public.set_verification_status(uuid, public.verification_status, text) to authenticated;
grant execute on function public.resolve_report(uuid, public.report_status, text) to authenticated;
grant execute on function public.set_account_status(uuid, public.account_status, text) to authenticated;
grant execute on function public.grant_admin(uuid, text) to service_role;
grant execute on function public.notify(uuid, text, text, text, jsonb, text) to service_role;

-- ---------------------------------------------------------------------
-- Comments
-- ---------------------------------------------------------------------
comment on function public.current_auth_user_id() is
  'Supabase Auth user id of the caller (request.jwt.claims.sub). NULL when signed out.';
comment on table public.job_transition_rules is
  'Authoritative job status transition matrix. Mirrors JOB_TRANSITIONS in packages/shared-types/src/statuses.ts.';
comment on table public.booking_transition_rules is
  'Authoritative booking status transition matrix. Mirrors BOOKING_TRANSITIONS in packages/shared-types/src/statuses.ts.';
