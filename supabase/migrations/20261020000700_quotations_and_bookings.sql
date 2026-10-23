-- =====================================================================
-- FixLink Ethiopia - 008: quotations and bookings
-- =====================================================================
-- APPLY ORDER: this file comes AFTER job_requests (the FK target) and
-- BEFORE matching. The matching migration defines
-- public.find_matching_professionals(), a LANGUAGE sql function whose
-- body references public.bookings; a LANGUAGE sql body is analysed when
-- the function is created, so `bookings` has to exist first.
--
-- A quotation is a professional's price for a specific request.
-- A booking is created ONLY by accepting a quotation, and that acceptance
-- is a single atomic database operation:
--
--   * at most one quotation can be accepted per job
--   * the customer who owns the job is the only actor allowed to accept
--   * the quotation must still be valid
--   * a concurrent second acceptance is rejected (the job row is locked)
--
-- All money is Ethiopian Birr (ETB), stored as numeric(12,2).
-- =====================================================================

create table if not exists public.quotations (
  id uuid primary key default extensions.gen_random_uuid(),
  job_id uuid not null references public.job_requests (id) on delete cascade,
  professional_id uuid not null references public.professionals (id) on delete cascade,
  labor_cost_etb numeric(12, 2) not null check (labor_cost_etb >= 0),
  materials_cost_etb numeric(12, 2) not null default 0 check (materials_cost_etb >= 0),
  notes text not null check (char_length(notes) between 10 and 2000),
  proposed_start_at timestamptz,
  valid_until timestamptz not null,
  status public.quotation_status not null default 'submitted',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- A professional may hold at most one live quotation per request.
create unique index if not exists quotations_one_live_per_professional
  on public.quotations (job_id, professional_id)
  where status = 'submitted';

create index if not exists quotations_job_idx
  on public.quotations (job_id, created_at);
create index if not exists quotations_professional_idx
  on public.quotations (professional_id, created_at desc);

comment on column public.quotations.valid_until is
  'The offer stops being selectable after this instant.';

drop trigger if exists quotations_set_updated_at on public.quotations;
create trigger quotations_set_updated_at
  before update on public.quotations
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Bookings
-- ---------------------------------------------------------------------
create table if not exists public.bookings (
  id uuid primary key default extensions.gen_random_uuid(),
  job_id uuid not null references public.job_requests (id) on delete cascade,
  quotation_id uuid not null references public.quotations (id),
  customer_id uuid not null references public.profiles (id) on delete cascade,
  professional_id uuid not null references public.professionals (id) on delete cascade,
  scheduled_at timestamptz not null,
  status public.booking_status not null default 'booked',
  accepted_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  cancellation_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- At most one live booking per job. Cancelled bookings are released so a
-- job can be re-booked after a cancellation.
create unique index if not exists bookings_one_active_per_job
  on public.bookings (job_id)
  where status <> 'cancelled';

create index if not exists bookings_customer_idx
  on public.bookings (customer_id, scheduled_at desc);
create index if not exists bookings_professional_idx
  on public.bookings (professional_id, scheduled_at desc);
create index if not exists bookings_job_idx on public.bookings (job_id);

drop trigger if exists bookings_set_updated_at on public.bookings;
create trigger bookings_set_updated_at
  before update on public.bookings
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Booking transition matrix (mirrors BOOKING_TRANSITIONS in shared-types)
-- ---------------------------------------------------------------------
create table if not exists public.booking_transition_rules (
  from_status public.booking_status not null,
  to_status public.booking_status not null,
  actor text not null check (actor in ('customer', 'professional', 'system', 'admin')),
  condition text not null,
  primary key (from_status, to_status, actor)
);

insert into public.booking_transition_rules (from_status, to_status, actor, condition)
values
  ('booked', 'in_progress', 'professional', 'scheduled work begins'),
  ('booked', 'in_progress', 'customer', 'scheduled work begins'),
  ('booked', 'in_progress', 'admin', 'administrator starts the job'),
  ('booked', 'cancelled', 'customer', 'cancellation rules allow it'),
  ('booked', 'cancelled', 'professional', 'cancellation rules allow it'),
  ('booked', 'cancelled', 'admin', 'cancellation rules allow it'),
  ('booked', 'disputed', 'customer', 'problem reported against the booking'),
  ('booked', 'disputed', 'professional', 'problem reported against the booking'),
  ('booked', 'disputed', 'admin', 'problem reported against the booking'),
  ('in_progress', 'completed', 'customer', 'customer confirms completion'),
  ('in_progress', 'completed', 'system', 'customer confirms completion'),
  ('in_progress', 'completed', 'admin', 'administrator confirms completion'),
  ('in_progress', 'cancelled', 'customer', 'work abandoned before completion under allowed rules'),
  ('in_progress', 'cancelled', 'professional', 'work abandoned before completion under allowed rules'),
  ('in_progress', 'cancelled', 'admin', 'work abandoned before completion under allowed rules'),
  ('in_progress', 'disputed', 'customer', 'problem reported during the job'),
  ('in_progress', 'disputed', 'professional', 'problem reported during the job'),
  ('in_progress', 'disputed', 'admin', 'problem reported during the job'),
  ('completed', 'disputed', 'customer', 'problem reported inside the dispute window'),
  ('completed', 'disputed', 'professional', 'problem reported inside the dispute window'),
  ('completed', 'disputed', 'admin', 'problem reported inside the dispute window'),
  ('disputed', 'completed', 'admin', 'admin resolves the dispute in favour of completion'),
  ('disputed', 'cancelled', 'admin', 'admin resolves the dispute by cancelling')
on conflict do nothing;

-- ---------------------------------------------------------------------
-- Submit a quotation
-- ---------------------------------------------------------------------
create or replace function public.submit_quotation(
  p_job_id uuid,
  p_labor_cost_etb numeric,
  p_materials_cost_etb numeric,
  p_notes text,
  p_proposed_start_at timestamptz default null,
  p_valid_for_hours int default 168
)
returns public.quotations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_professional_id uuid := public.current_professional_id();
  v_job public.job_requests;
  v_quotation public.quotations;
begin
  if v_professional_id is null then
    raise exception 'not_a_professional' using errcode = '42501';
  end if;

  if p_labor_cost_etb is null or p_labor_cost_etb < 0
     or p_materials_cost_etb is null or p_materials_cost_etb < 0 then
    raise exception 'negative_or_missing_cost' using errcode = '22023';
  end if;

  if p_labor_cost_etb > 999999999999.99 or p_materials_cost_etb > 999999999999.99 then
    raise exception 'cost_out_of_range' using errcode = '22023';
  end if;

  if char_length(btrim(coalesce(p_notes, ''))) < 10
     or char_length(btrim(coalesce(p_notes, ''))) > 2000 then
    raise exception 'invalid_notes' using errcode = '22023';
  end if;

  if coalesce(p_valid_for_hours, 168) < 1 or coalesce(p_valid_for_hours, 168) > 2160 then
    raise exception 'invalid_validity' using errcode = '22023';
  end if;

  select * into v_job
  from public.job_requests
  where id = p_job_id
  for update;

  if not found then
    raise exception 'job_not_found' using errcode = 'P0002';
  end if;

  if v_job.status not in ('matching', 'quoted', 'open') then
    raise exception 'job_not_quotable' using errcode = '22023';
  end if;

  -- The professional must be approved, accept requests, and offer the
  -- requested category.
  if not exists (
    select 1
    from public.professionals pr
    join public.professional_services ps on ps.professional_id = pr.id
    where pr.id = v_professional_id
      and pr.verification_status = 'approved'
      and pr.accepts_requests
      and ps.category_id = v_job.category_id
  ) then
    raise exception 'not_eligible_to_quote' using errcode = '42501';
  end if;

  -- The professional must have been matched to this request.
  if not exists (
    select 1 from public.job_matches m
    where m.job_id = p_job_id and m.professional_id = v_professional_id
  ) then
    raise exception 'not_matched_to_job' using errcode = '42501';
  end if;

  -- One live quotation per professional per job: replace the old one.
  update public.quotations
     set status = 'expired', updated_at = now()
   where job_id = p_job_id
     and professional_id = v_professional_id
     and status = 'submitted';

  insert into public.quotations (
    job_id, professional_id, labor_cost_etb, materials_cost_etb,
    notes, proposed_start_at, valid_until, status
  )
  values (
    p_job_id, v_professional_id, p_labor_cost_etb, coalesce(p_materials_cost_etb, 0),
    btrim(p_notes), p_proposed_start_at,
    now() + make_interval(hours => coalesce(p_valid_for_hours, 168)),
    'submitted'
  )
  returning * into v_quotation;

  update public.job_matches
     set response_status = 'quoted'
   where job_id = p_job_id and professional_id = v_professional_id;

  if v_job.status in ('open', 'matching') then
    update public.job_requests set status = 'quoted' where id = p_job_id;

    insert into public.job_status_events (
      job_id, actor_id, actor_role, from_status, to_status, note
    )
    values (
      p_job_id, v_professional_id, 'professional', v_job.status, 'quoted',
      'First quotation received'
    );
  end if;

  perform public.notify(
    v_job.customer_id,
    'quotation.received',
    'You received a quotation',
    format('A professional sent a quotation for "%s".', v_job.title),
    jsonb_build_object('jobId', p_job_id, 'quotationId', v_quotation.id),
    format('quotation:%s', v_quotation.id)
  );

  return v_quotation;
end;
$$;

comment on function public.submit_quotation(uuid, numeric, numeric, text, timestamptz, int) is
  'Submit (or replace) the signed-in professional''s quotation for a matched request.';

-- ---------------------------------------------------------------------
-- Accept a quotation -> create the booking (ATOMIC)
-- ---------------------------------------------------------------------
create or replace function public.accept_quotation(
  p_quotation_id uuid,
  p_scheduled_at timestamptz default null
)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.current_profile_id();
  v_quotation public.quotations;
  v_job public.job_requests;
  v_booking public.bookings;
  v_scheduled timestamptz;
  v_from_status public.job_status;
begin
  if v_actor is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  -- Lock the quotation first, then the job. The job lock is what makes
  -- two concurrent acceptances safe: the second transaction waits and
  -- then sees status = 'booked' and is rejected.
  select * into v_quotation
  from public.quotations
  where id = p_quotation_id
  for update;

  if not found then
    raise exception 'quotation_not_found' using errcode = 'P0002';
  end if;

  select * into v_job
  from public.job_requests
  where id = v_quotation.job_id
  for update;

  if not found then
    raise exception 'job_not_found' using errcode = 'P0002';
  end if;

  -- 1. Only the customer who owns the job may accept.
  if v_job.customer_id <> v_actor then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  -- 2. The quotation must belong to this job (implied by the lookup, but
  --    kept explicit for readability of the security contract).
  if v_quotation.job_id <> v_job.id then
    raise exception 'quotation_job_mismatch' using errcode = '22023';
  end if;

  -- 3. The quotation must still be selectable.
  if v_quotation.status <> 'submitted' then
    raise exception 'quotation_not_selectable' using errcode = '22023';
  end if;

  if v_quotation.valid_until <= now() then
    raise exception 'quotation_expired' using errcode = '22023';
  end if;

  -- 4. The job must still be in a bookable state.
  if v_job.status not in ('open', 'matching', 'quoted') then
    raise exception 'job_not_bookable' using errcode = '22023';
  end if;

  -- 5. No other live booking for this job.
  if exists (
    select 1 from public.bookings b
    where b.job_id = v_job.id and b.status <> 'cancelled'
  ) then
    raise exception 'booking_already_exists' using errcode = '23505';
  end if;

  v_scheduled := coalesce(
    p_scheduled_at,
    v_quotation.proposed_start_at,
    now() + interval '24 hours'
  );

  -- 6. The winner is selected, the others are declined.
  update public.quotations
     set status = 'declined', updated_at = now()
   where job_id = v_job.id and id <> v_quotation.id and status = 'submitted';

  update public.quotations
     set status = 'selected', updated_at = now()
   where id = v_quotation.id;

  -- 7. The booking is created.
  insert into public.bookings (
    job_id, quotation_id, customer_id, professional_id, scheduled_at, status, accepted_at
  )
  values (
    v_job.id, v_quotation.id, v_job.customer_id, v_quotation.professional_id,
    v_scheduled, 'booked', now()
  )
  returning * into v_booking;

  -- 8. The job moves to 'booked'.
  v_from_status := v_job.status;
  update public.job_requests
     set status = 'booked'
   where id = v_job.id;

  insert into public.job_status_events (
    job_id, booking_id, actor_id, actor_role, from_status, to_status, note
  )
  values (
    v_job.id, v_booking.id, v_actor, 'customer', v_from_status, 'booked',
    'Quotation accepted'
  );

  -- 9. Both sides are notified.
  perform public.notify(
    v_quotation.professional_id,
    'quotation.selected',
    'Your quotation was accepted',
    format('A customer accepted your quotation for "%s".', v_job.title),
    jsonb_build_object('jobId', v_job.id, 'bookingId', v_booking.id),
    format('quotation-selected:%s', v_quotation.id)
  );

  perform public.notify(
    v_job.customer_id,
    'booking.created',
    'Booking created',
    'Your booking is confirmed. You can message your professional in the app.',
    jsonb_build_object('jobId', v_job.id, 'bookingId', v_booking.id),
    format('booking-created:%s', v_booking.id)
  );

  return v_booking;
end;
$$;

comment on function public.accept_quotation(uuid, timestamptz) is
  'Atomically accept a quotation and create the booking. At most one quotation can win per job.';

-- ---------------------------------------------------------------------
-- Booking lifecycle transitions
-- ---------------------------------------------------------------------
create or replace function public.transition_booking(
  p_booking_id uuid,
  p_to public.booking_status,
  p_reason text default null
)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.current_profile_id();
  v_booking public.bookings;
  v_actor_role text;
  v_from_status public.booking_status;
begin
  select * into v_booking
  from public.bookings
  where id = p_booking_id
  for update;

  if not found then
    raise exception 'booking_not_found' using errcode = 'P0002';
  end if;

  if public.is_admin() then
    v_actor_role := 'admin';
  elsif v_actor is not null and v_booking.customer_id = v_actor then
    v_actor_role := 'customer';
  elsif v_actor is not null and v_booking.professional_id = v_actor then
    v_actor_role := 'professional';
  elsif v_actor is null and current_setting('role', true) = 'service_role' then
    v_actor_role := 'system';
  else
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.booking_transition_rules
    where from_status = v_booking.status and to_status = p_to and actor = v_actor_role
  ) then
    raise exception 'transition_not_allowed' using errcode = '22023';
  end if;

  if p_to = 'cancelled' and char_length(btrim(coalesce(p_reason, ''))) < 3 then
    raise exception 'cancellation_reason_required' using errcode = '22023';
  end if;

  v_from_status := v_booking.status;

  update public.bookings
     set status = p_to,
         started_at = case when p_to = 'in_progress' then coalesce(started_at, now()) else started_at end,
         completed_at = case when p_to = 'completed' then coalesce(completed_at, now()) else completed_at end,
         cancelled_at = case when p_to = 'cancelled' then coalesce(cancelled_at, now()) else cancelled_at end,
         cancellation_reason = case when p_to = 'cancelled' then p_reason else cancellation_reason end
   where id = p_booking_id
   returning * into v_booking;

  -- Keep the job status in step with the booking status.
  if p_to in ('in_progress', 'completed', 'cancelled', 'disputed') then
    update public.job_requests
       set status = case
         when p_to = 'in_progress' then 'in_progress'::public.job_status
         when p_to = 'completed' then 'completed'::public.job_status
         when p_to = 'cancelled' then 'cancelled'::public.job_status
         else 'disputed'::public.job_status
       end
     where id = v_booking.job_id
       and status not in ('completed', 'cancelled', 'disputed');

    insert into public.job_status_events (
      job_id, booking_id, actor_id, actor_role, from_status, to_status, note
    )
    values (
      v_booking.job_id, v_booking.id, v_actor, v_actor_role, v_from_status, p_to,
      nullif(p_reason, '')
    );
  end if;

  perform public.notify(
    v_booking.customer_id,
    case when p_to = 'completed' then 'booking.completed' else 'booking.updated' end,
    'Booking update',
    format('Your booking is now %s.', p_to),
    jsonb_build_object('jobId', v_booking.job_id, 'bookingId', v_booking.id, 'status', p_to),
    format('booking-status:%s:%s', v_booking.id, p_to)
  );

  perform public.notify(
    v_booking.professional_id,
    case when p_to = 'completed' then 'booking.completed' else 'booking.updated' end,
    'Booking update',
    format('Your booking is now %s.', p_to),
    jsonb_build_object('jobId', v_booking.job_id, 'bookingId', v_booking.id, 'status', p_to),
    format('booking-status:%s:%s', v_booking.id, p_to)
  );

  return v_booking;
end;
$$;

comment on function public.transition_booking(uuid, public.booking_status, text) is
  'Move a booking through its lifecycle, enforcing the booking transition matrix.';

-- ---------------------------------------------------------------------
-- Reschedule a booking (both parties may ask, the other is notified)
-- ---------------------------------------------------------------------
create or replace function public.reschedule_booking(
  p_booking_id uuid,
  p_scheduled_at timestamptz,
  p_reason text default null
)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.current_profile_id();
  v_booking public.bookings;
begin
  select * into v_booking from public.bookings where id = p_booking_id for update;
  if not found then
    raise exception 'booking_not_found' using errcode = 'P0002';
  end if;

  if v_actor is null
     or (v_booking.customer_id <> v_actor
         and v_booking.professional_id <> v_actor
         and not public.is_admin())
  then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if v_booking.status not in ('booked', 'in_progress') then
    raise exception 'booking_not_reschedulable' using errcode = '22023';
  end if;

  update public.bookings
     set scheduled_at = p_scheduled_at
   where id = p_booking_id
   returning * into v_booking;

  insert into public.job_status_events (
    job_id, booking_id, actor_id, actor_role, from_status, to_status, note
  )
  values (
    v_booking.job_id, v_booking.id, v_actor,
    case when v_booking.customer_id = v_actor then 'customer' else 'professional' end,
    v_booking.status, v_booking.status,
    coalesce(nullif(btrim(coalesce(p_reason, '')), ''), 'Rescheduled')
  );

  perform public.notify(
    case when v_booking.customer_id = v_actor
         then v_booking.professional_id
         else v_booking.customer_id end,
    'booking.updated',
    'Schedule changed',
    'The scheduled time for your booking has changed.',
    jsonb_build_object('jobId', v_booking.job_id, 'bookingId', v_booking.id),
    format('booking-reschedule:%s:%s', v_booking.id, extract(epoch from p_scheduled_at)::bigint)
  );

  return v_booking;
end;
$$;

-- ---------------------------------------------------------------------
-- Helper: is the caller a participant of this booking?
-- ---------------------------------------------------------------------
create or replace function public.is_booking_participant(p_booking_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.bookings b
    where b.id = p_booking_id
      and (
        b.customer_id = public.current_profile_id()
        or b.professional_id = public.current_professional_id()
        or public.is_admin()
      )
  );
$$;

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------
alter table public.quotations enable row level security;

drop policy if exists "quotations_select_participants" on public.quotations;
create policy "quotations_select_participants"
  on public.quotations
  for select
  to authenticated
  using (
    professional_id = public.current_professional_id()
    or public.is_admin()
    or exists (
      select 1 from public.job_requests j
      where j.id = quotations.job_id
        and j.customer_id = public.current_profile_id()
    )
  );

revoke insert, update, delete on public.quotations from anon, authenticated;
grant select on public.quotations to authenticated;

alter table public.bookings enable row level security;

drop policy if exists "bookings_select_participants" on public.bookings;
create policy "bookings_select_participants"
  on public.bookings
  for select
  to authenticated
  using (
    customer_id = public.current_profile_id()
    or professional_id = public.current_professional_id()
    or public.is_admin()
  );

revoke insert, update, delete on public.bookings from anon, authenticated;
grant select on public.bookings to authenticated;
