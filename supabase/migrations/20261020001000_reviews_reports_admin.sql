-- =====================================================================
-- FixLink Ethiopia - 011: reviews, reports, account restrictions
-- =====================================================================
-- Reviews are tied to a GENUINE completed booking: the reviewer must be
-- the customer of a booking whose status is 'completed'. The rating
-- summary on `professionals` is maintained by a trigger, so it can never
-- drift from the underlying reviews.
--
-- Reports (complaints) can be filed against a user or a booking and are
-- resolved by administrators, with the resolution recorded.
-- =====================================================================

create table if not exists public.reviews (
  id uuid primary key default extensions.gen_random_uuid(),
  booking_id uuid not null unique references public.bookings (id) on delete cascade,
  reviewer_id uuid not null references public.profiles (id) on delete cascade,
  professional_id uuid not null references public.professionals (id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  comment text check (char_length(comment) <= 1000),
  created_at timestamptz not null default now()
);

create index if not exists reviews_professional_idx
  on public.reviews (professional_id, created_at desc);
create index if not exists reviews_reviewer_idx on public.reviews (reviewer_id);

comment on table public.reviews is
  'Verified-job reviews. One review per booking; the booking must be completed.';

-- ---------------------------------------------------------------------
-- Reports / complaints
-- ---------------------------------------------------------------------
create table if not exists public.reports (
  id uuid primary key default extensions.gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  reported_user_id uuid references public.profiles (id) on delete set null,
  booking_id uuid references public.bookings (id) on delete set null,
  reason public.report_reason not null,
  details text not null check (char_length(details) between 10 and 2000),
  status public.report_status not null default 'open',
  resolution text,
  resolved_by uuid references public.profiles (id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  -- A report must point at something.
  check (reported_user_id is not null or booking_id is not null)
);

create index if not exists reports_status_idx on public.reports (status, created_at desc);
create index if not exists reports_reporter_idx on public.reports (reporter_id, created_at desc);
create index if not exists reports_booking_idx on public.reports (booking_id);

-- ---------------------------------------------------------------------
-- Submit a review
-- ---------------------------------------------------------------------
create or replace function public.create_review(
  p_booking_id uuid,
  p_rating integer,
  p_comment text default null
)
returns public.reviews
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.current_profile_id();
  v_booking public.bookings;
  v_review public.reviews;
begin
  if v_actor is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  if p_rating is null or p_rating < 1 or p_rating > 5 then
    raise exception 'invalid_rating' using errcode = '22023';
  end if;

  if p_comment is not null and char_length(p_comment) > 1000 then
    raise exception 'comment_too_long' using errcode = '22023';
  end if;

  select * into v_booking
  from public.bookings
  where id = p_booking_id
  for update;

  if not found then
    raise exception 'booking_not_found' using errcode = 'P0002';
  end if;

  -- Only the customer of the booking may review it.
  if v_booking.customer_id <> v_actor then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  -- Only a completed booking is reviewable.
  if v_booking.status <> 'completed' then
    raise exception 'booking_not_reviewable' using errcode = '22023';
  end if;

  insert into public.reviews (booking_id, reviewer_id, professional_id, rating, comment)
  values (p_booking_id, v_actor, v_booking.professional_id, p_rating, nullif(btrim(coalesce(p_comment, '')), ''))
  returning * into v_review;

  perform public.notify(
    v_booking.professional_id,
    'review.received',
    'You received a review',
    format('You received a %s star review for a completed job.', p_rating),
    jsonb_build_object('bookingId', p_booking_id, 'reviewId', v_review.id),
    format('review:%s', v_review.id)
  );

  return v_review;
end;
$$;

-- ---------------------------------------------------------------------
-- Keep the professional rating summary in step with the reviews
-- ---------------------------------------------------------------------
create or replace function public.refresh_professional_rating()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_professional uuid := coalesce(new.professional_id, old.professional_id);
begin
  update public.professionals p
     set average_rating = sub.avg_rating,
         total_reviews = sub.total_reviews
  from (
    select
      count(*)::int as total_reviews,
      round(avg(r.rating)::numeric, 2) as avg_rating
    from public.reviews r
    where r.professional_id = v_professional
  ) sub
  where p.id = v_professional;

  return coalesce(new, old);
end;
$$;

drop trigger if exists reviews_refresh_rating on public.reviews;
create trigger reviews_refresh_rating
  after insert or update or delete on public.reviews
  for each row execute function public.refresh_professional_rating();

-- ---------------------------------------------------------------------
-- Count completed jobs for the professional
-- ---------------------------------------------------------------------
create or replace function public.refresh_professional_completed_jobs()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.professionals p
     set completed_jobs = sub.completed
  from (
    select count(*)::int as completed
    from public.bookings b
    where b.professional_id = coalesce(new.professional_id, old.professional_id)
      and b.status = 'completed'
  ) sub
  where p.id = coalesce(new.professional_id, old.professional_id);

  return coalesce(new, old);
end;
$$;

drop trigger if exists bookings_refresh_completed_jobs on public.bookings;
create trigger bookings_refresh_completed_jobs
  after insert or update of status on public.bookings
  for each row execute function public.refresh_professional_completed_jobs();

-- ---------------------------------------------------------------------
-- File a report / complaint
-- ---------------------------------------------------------------------
create or replace function public.create_report(
  p_reported_user_id uuid default null,
  p_booking_id uuid default null,
  p_reason public.report_reason default 'other',
  p_details text default null
)
returns public.reports
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.current_profile_id();
  v_report public.reports;
begin
  if v_actor is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  if p_reported_user_id is null and p_booking_id is null then
    raise exception 'report_target_required' using errcode = '22023';
  end if;

  if char_length(btrim(coalesce(p_details, ''))) < 10
     or char_length(btrim(coalesce(p_details, ''))) > 2000 then
    raise exception 'invalid_details' using errcode = '22023';
  end if;

  -- A customer may only report a booking they took part in.
  if p_booking_id is not null and not public.is_booking_participant(p_booking_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  insert into public.reports (reporter_id, reported_user_id, booking_id, reason, details)
  values (v_actor, p_reported_user_id, p_booking_id, coalesce(p_reason, 'other'), btrim(p_details))
  returning * into v_report;

  perform public.notify(
    v_actor,
    'report.filed',
    'Report received',
    'Your report has been filed. An administrator will review it.',
    jsonb_build_object('reportId', v_report.id),
    format('report-filed:%s', v_report.id)
  );

  return v_report;
end;
$$;

-- ---------------------------------------------------------------------
-- Administrator: resolve a report
-- ---------------------------------------------------------------------
create or replace function public.resolve_report(
  p_report_id uuid,
  p_status public.report_status,
  p_resolution text
)
returns public.reports
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.current_profile_id();
  v_report public.reports;
begin
  if not public.is_admin() then
    raise exception 'admin_required' using errcode = '42501';
  end if;

  if p_status not in ('resolved', 'dismissed', 'investigating') then
    raise exception 'invalid_status' using errcode = '22023';
  end if;

  if char_length(btrim(coalesce(p_resolution, ''))) < 5 then
    raise exception 'resolution_required' using errcode = '22023';
  end if;

  update public.reports
     set status = p_status,
         resolution = btrim(p_resolution),
         resolved_by = v_actor,
         resolved_at = now()
   where id = p_report_id
   returning * into v_report;

  if v_report.id is null then
    raise exception 'report_not_found' using errcode = 'P0002';
  end if;

  insert into public.audit_log (actor_id, actor_role, action, entity_type, entity_id, details)
  values (
    v_actor, 'admin', 'report.' || p_status::text, 'report', p_report_id,
    jsonb_build_object('resolution', p_resolution)
  );

  perform public.notify(
    v_report.reporter_id,
    'report.resolved',
    'Report update',
    format('Your report was marked as %s.', p_status),
    jsonb_build_object('reportId', p_report_id, 'status', p_status),
    format('report-status:%s:%s', p_report_id, p_status)
  );

  return v_report;
end;
$$;

-- ---------------------------------------------------------------------
-- Administrator: suspend / close / reinstate an account
-- ---------------------------------------------------------------------
create or replace function public.set_account_status(
  p_profile_id uuid,
  p_status public.account_status,
  p_reason text default null
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.current_profile_id();
  v_profile public.profiles;
  v_previous public.account_status;
begin
  if not public.is_admin() then
    raise exception 'admin_required' using errcode = '42501';
  end if;

  if p_status not in ('active', 'suspended', 'closed') then
    raise exception 'invalid_status' using errcode = '22023';
  end if;

  select * into v_profile
  from public.profiles
  where id = p_profile_id
  for update;

  if not found then
    raise exception 'profile_not_found' using errcode = 'P0002';
  end if;

  v_previous := v_profile.account_status;

  update public.profiles
     set account_status = p_status
   where id = p_profile_id
   returning * into v_profile;

  insert into public.audit_log (actor_id, actor_role, action, entity_type, entity_id, details)
  values (
    v_actor, 'admin', 'account.status_' || p_status::text, 'profile', p_profile_id,
    jsonb_build_object('previousStatus', v_previous, 'newStatus', p_status, 'reason', p_reason)
  );

  perform public.notify(
    p_profile_id,
    'account.restricted',
    'Account status updated',
    case
      when p_status = 'suspended' then 'Your account has been suspended. Contact support for details.'
      when p_status = 'closed' then 'Your account has been closed.'
      else 'Your account is active again.'
    end,
    jsonb_build_object('status', p_status),
    format('account-status:%s:%s', p_profile_id, p_status)
  );

  return v_profile;
end;
$$;

-- ---------------------------------------------------------------------
-- Grant / revoke the administrator role (bootstrap + administration)
-- ---------------------------------------------------------------------
-- The FIRST administrator is granted by a database administrator running
-- this function directly in the Supabase SQL editor. There is no
-- self-service path to `admin`: the function refuses to run for a caller
-- who is not already an administrator, except for the very first one.
create or replace function public.grant_admin(
  p_profile_id uuid,
  p_reason text default 'bootstrap'
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.current_profile_id();
  v_profile public.profiles;
  v_admin_count integer;
begin
  select count(*) into v_admin_count
  from public.profiles
  where role = 'admin';

  -- Bootstrap: the very first administrator, run from the SQL editor
  -- (where the caller is the `postgres` role and has no Auth session).
  if v_admin_count = 0 and (
    v_actor is null
    or current_setting('role', true) in ('service_role', 'postgres', 'supabase_admin')
  ) then
    update public.profiles
       set role = 'admin'
     where id = p_profile_id
     returning * into v_profile;

    insert into public.audit_log (actor_id, actor_role, action, entity_type, entity_id, details)
    values (v_actor, 'admin', 'profile.grant_admin', 'profile', p_profile_id,
      jsonb_build_object('reason', p_reason));

    return v_profile;
  end if;

  if not public.is_admin() then
    raise exception 'admin_required' using errcode = '42501';
  end if;

  update public.profiles
     set role = 'admin'
   where id = p_profile_id
   returning * into v_profile;

  insert into public.audit_log (actor_id, actor_role, action, entity_type, entity_id, details)
  values (v_actor, 'admin', 'profile.grant_admin', 'profile', p_profile_id,
    jsonb_build_object('reason', p_reason));

  return v_profile;
end;
$$;

comment on function public.grant_admin(uuid, text) is
  'Grant the admin role. The first administrator may be bootstrapped from the SQL editor; afterwards only admins may call it.';

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------
alter table public.reviews enable row level security;

drop policy if exists "reviews_select_public" on public.reviews;
create policy "reviews_select_public"
  on public.reviews
  for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.professionals pr
      where pr.id = reviews.professional_id
        and pr.verification_status = 'approved'
    )
    or reviewer_id = public.current_profile_id()
    or public.is_admin()
  );

revoke insert, update, delete on public.reviews from anon, authenticated;
grant select on public.reviews to anon, authenticated;

alter table public.reports enable row level security;

drop policy if exists "reports_select_participants" on public.reports;
create policy "reports_select_participants"
  on public.reports
  for select
  to authenticated
  using (
    reporter_id = public.current_profile_id()
    or reported_user_id = public.current_profile_id()
    or public.is_admin()
  );

revoke insert, update, delete on public.reports from anon, authenticated;
grant select on public.reports to authenticated;
