-- =====================================================================
-- FixLink Ethiopia - 007: job requests, photos, status events
-- =====================================================================
-- APPLY ORDER: this file comes after 20261020000500_notifications_and_push.sql
-- and before 20261020000700_quotations_and_bookings.sql. It creates the
-- `job_requests` table, which almost every other part of the marketplace
-- refers to.
--
-- A service request moves through: open -> matching -> quoted -> booked
-- -> in_progress -> completed, with cancelled / disputed / expired as
-- the alternative exits.
--
-- The transition matrix lives in `public.job_transition_rules`, seeded
-- from packages/shared-types/src/statuses.ts (JOB_TRANSITIONS). The
-- DATABASE is authoritative: `public.transition_job()` refuses any
-- transition that is not in the table.
-- =====================================================================

do $$
begin
  if not exists (select 1 from pg_type where typname = 'location_source') then
    create type public.location_source as enum ('gps', 'manual');
  end if;
end
$$;

-- The `location_source` enum is kept for the databases that were migrated
-- before the platform moved from GPS coordinates to sub-cities. Nothing
-- writes to it any more: a request is located by its sub-city.

-- ---------------------------------------------------------------------
-- Transition rule matrix (mirrors JOB_TRANSITIONS in shared-types)
-- ---------------------------------------------------------------------
create table if not exists public.job_transition_rules (
  from_status public.job_status not null,
  to_status public.job_status not null,
  actor text not null check (actor in ('customer', 'professional', 'system', 'admin')),
  condition text not null,
  primary key (from_status, to_status, actor)
);

insert into public.job_transition_rules (from_status, to_status, actor, condition)
values
  ('open', 'matching', 'system', 'matching task picked up the request'),
  ('open', 'cancelled', 'customer', 'owner cancels before any quotation is accepted'),
  ('open', 'cancelled', 'admin', 'administrator cancels the request'),
  ('open', 'expired', 'system', 'expired before matching started'),
  ('matching', 'quoted', 'system', 'first eligible quotation submitted'),
  ('matching', 'cancelled', 'customer', 'owner cancels before booking'),
  ('matching', 'cancelled', 'admin', 'administrator cancels the request'),
  ('matching', 'expired', 'system', 'no response within configured timeout windows'),
  ('quoted', 'booked', 'customer', 'owner accepts exactly one valid quotation (atomic)'),
  ('quoted', 'booked', 'system', 'owner accepts exactly one valid quotation (atomic)'),
  ('quoted', 'matching', 'system', 're-queue after all quotations expired'),
  ('quoted', 'cancelled', 'customer', 'owner cancels before booking'),
  ('quoted', 'cancelled', 'admin', 'administrator cancels the request'),
  ('quoted', 'expired', 'system', 'quoting window elapsed without acceptance'),
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
-- Job requests
-- ---------------------------------------------------------------------
create table if not exists public.job_requests (
  id uuid primary key default extensions.gen_random_uuid(),
  customer_id uuid not null references public.profiles (id) on delete cascade,
  category_id uuid not null references public.service_categories (id),
  title text not null check (char_length(title) between 5 and 120),
  description text not null check (char_length(description) between 10 and 5000),
  priority public.job_priority not null default 'normal',
  status public.job_status not null default 'open',
  -- The sub-city of Dire Dawa where the job is. The customer chooses it
  -- from the list; they never send coordinates.
  sub_city_code text not null references public.sub_cities (code),
  -- A copy of the name of that sub-city, so the screens can show it
  -- without a second lookup.
  area_name text not null check (char_length(area_name) between 2 and 120),
  -- The point of the sub-city. It is never collected: it is taken from
  -- `public.sub_cities` and only used to measure the distance between two
  -- sub-cities during the matching.
  location extensions.geography(point, 4326) not null,
  -- Highest match score achieved for this request (evaluation metric).
  match_score numeric(6, 5),
  expires_at timestamptz,
  -- Client supplied key so an accidental double submit cannot create two
  -- requests. NULL means "no de-duplication requested".
  idempotency_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (customer_id, idempotency_key)
);

create index if not exists job_requests_customer_idx
  on public.job_requests (customer_id, created_at desc);
create index if not exists job_requests_status_idx
  on public.job_requests (status, created_at desc);
create index if not exists job_requests_category_idx
  on public.job_requests (category_id);
create index if not exists job_requests_location_idx
  on public.job_requests using gist (location);
create index if not exists job_requests_expiry_idx
  on public.job_requests (expires_at)
  where status in ('open', 'matching', 'quoted');

comment on column public.job_requests.match_score is
  'Best match score achieved for this request. Kept for pilot evaluation.';
comment on column public.job_requests.idempotency_key is
  'Client supplied de-duplication key, unique per customer.';

drop trigger if exists job_requests_set_updated_at on public.job_requests;
create trigger job_requests_set_updated_at
  before update on public.job_requests
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Job photos (private storage objects)
-- ---------------------------------------------------------------------
create table if not exists public.job_photos (
  id uuid primary key default extensions.gen_random_uuid(),
  job_id uuid not null references public.job_requests (id) on delete cascade,
  -- Private bucket path: job-photos/<customerId>/<jobId>/<uuid>.<ext>
  storage_path text not null,
  caption text check (char_length(caption) <= 200),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists job_photos_job_idx on public.job_photos (job_id, sort_order);

-- ---------------------------------------------------------------------
-- Status events (audit trail for every state change)
-- ---------------------------------------------------------------------
create table if not exists public.job_status_events (
  id uuid primary key default extensions.gen_random_uuid(),
  job_id uuid not null references public.job_requests (id) on delete cascade,
  booking_id uuid,
  actor_id uuid references public.profiles (id) on delete set null,
  actor_role text not null default 'system',
  from_status text not null,
  to_status text not null,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists job_status_events_job_idx
  on public.job_status_events (job_id, created_at);
create index if not exists job_status_events_booking_idx
  on public.job_status_events (booking_id);

-- ---------------------------------------------------------------------
-- Create a service request
-- ---------------------------------------------------------------------
create or replace function public.create_job_request(
  p_category_id uuid,
  p_title text,
  p_description text,
  p_sub_city_code text,
  p_priority public.job_priority default 'normal',
  p_idempotency_key text default null
)
returns public.job_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.current_profile_id();
  v_existing public.job_requests;
  v_job public.job_requests;
begin
  if v_actor is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  -- Idempotent retry: return the request that was already created.
  if p_idempotency_key is not null and length(btrim(p_idempotency_key)) >= 8 then
    select * into v_existing
    from public.job_requests
    where customer_id = v_actor and idempotency_key = p_idempotency_key;

    if found then
      return v_existing;
    end if;
  end if;

  if not exists (
    select 1 from public.service_categories
    where id = p_category_id and is_active
  ) then
    raise exception 'inactive_or_unknown_category' using errcode = '22023';
  end if;

  -- The location of a request is the sub-city it is in. The name and the
  -- point come from the reference table, never from the client. An unknown
  -- code inserts no row at all.
  insert into public.job_requests (
    customer_id, category_id, title, description, priority, status,
    sub_city_code, area_name, location, idempotency_key, expires_at
  )
  select
    v_actor,
    p_category_id,
    btrim(p_title),
    btrim(p_description),
    coalesce(p_priority, 'normal'),
    'open',
    sc.code,
    sc.name,
    sc.location,
    nullif(btrim(coalesce(p_idempotency_key, '')), ''),
    now() + interval '72 hours'
  from public.sub_cities sc
  where sc.code = p_sub_city_code
  returning * into v_job;

  if v_job.id is null then
    raise exception 'unknown_sub_city' using errcode = '22023';
  end if;

  insert into public.job_status_events (
    job_id, actor_id, actor_role, from_status, to_status, note
  )
  values (v_job.id, v_actor, 'customer', 'open', 'open', 'Request created');

  return v_job;
end;
$$;

comment on function public.create_job_request(uuid, text, text, text, public.job_priority, text) is
  'Create a service request for the signed-in customer. Idempotent when p_idempotency_key is supplied.';

-- ---------------------------------------------------------------------
-- Edit a request (only before it is booked)
-- ---------------------------------------------------------------------
create or replace function public.update_job_request(
  p_job_id uuid,
  p_title text default null,
  p_description text default null,
  p_sub_city_code text default null,
  p_priority public.job_priority default null
)
returns public.job_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.current_profile_id();
  v_job public.job_requests;
begin
  if v_actor is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  select * into v_job
  from public.job_requests
  where id = p_job_id
  for update;

  if not found then
    raise exception 'job_not_found' using errcode = 'P0002';
  end if;

  if v_job.customer_id <> v_actor and not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if v_job.status not in ('open', 'matching', 'quoted') then
    raise exception 'job_not_editable' using errcode = '22023';
  end if;

  -- The sub-city is only changed when the client sends a known one.
  if p_sub_city_code is not null
     and not exists (
       select 1 from public.sub_cities where code = p_sub_city_code
     ) then
    raise exception 'unknown_sub_city' using errcode = '22023';
  end if;

  update public.job_requests
     set title = coalesce(nullif(btrim(coalesce(p_title, '')), ''), title),
         description = coalesce(nullif(btrim(coalesce(p_description, '')), ''), description),
         sub_city_code = coalesce(p_sub_city_code, sub_city_code),
         area_name = coalesce(
           (select sc.name from public.sub_cities sc where sc.code = p_sub_city_code),
           area_name
         ),
         location = coalesce(
           (select sc.location from public.sub_cities sc where sc.code = p_sub_city_code),
           location
         ),
         priority = coalesce(p_priority, priority)
   where id = p_job_id
   returning * into v_job;

  return v_job;
end;
$$;

-- ---------------------------------------------------------------------
-- Controlled status transition
-- ---------------------------------------------------------------------
create or replace function public.transition_job(
  p_job_id uuid,
  p_to public.job_status,
  p_note text default null
)
returns public.job_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.current_profile_id();
  v_job public.job_requests;
  v_actor_role text;
  v_from_status public.job_status;
begin
  select * into v_job
  from public.job_requests
  where id = p_job_id
  for update;

  if not found then
    raise exception 'job_not_found' using errcode = 'P0002';
  end if;

  -- `booked` is only reachable through public.accept_quotation(), which
  -- performs the atomic "one quotation wins" logic.
  if p_to = 'booked' then
    raise exception 'use_accept_quotation' using errcode = '22023';
  end if;

  -- Resolve which actor role the caller is acting as.
  if public.is_admin() then
    v_actor_role := 'admin';
  elsif v_actor is not null and v_job.customer_id = v_actor then
    v_actor_role := 'customer';
  elsif v_actor is not null and exists (
    select 1 from public.bookings b
    where b.job_id = p_job_id and b.professional_id = v_actor
  ) then
    v_actor_role := 'professional';
  elsif v_actor is null and current_setting('role', true) = 'service_role' then
    v_actor_role := 'system';
  else
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.job_transition_rules
    where from_status = v_job.status and to_status = p_to and actor = v_actor_role
  ) then
    raise exception 'transition_not_allowed' using errcode = '22023';
  end if;

  v_from_status := v_job.status;

  update public.job_requests
     set status = p_to
   where id = p_job_id
   returning * into v_job;

  insert into public.job_status_events (
    job_id, actor_id, actor_role, from_status, to_status, note
  )
  values (
    p_job_id, v_actor, v_actor_role, v_from_status, p_to, nullif(p_note, '')
  );

  return v_job;
end;
$$;

comment on function public.transition_job(uuid, public.job_status, text) is
  'Apply a status change, enforcing the transition matrix in job_transition_rules.';

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------
-- The SELECT policies of job_requests, job_photos and job_status_events
-- live in 20261020001200_storage_and_participant_policies.sql: they join
-- job_matches and bookings, and PostgreSQL resolves every relation named
-- in a policy expression when the policy is created.
--
-- Writes go through the server functions, not direct table writes.
alter table public.job_requests enable row level security;
revoke insert, update, delete on public.job_requests from anon, authenticated;
grant select on public.job_requests to authenticated;

alter table public.job_photos enable row level security;
revoke update on public.job_photos from anon, authenticated;
grant select, insert, delete on public.job_photos to authenticated;

alter table public.job_status_events enable row level security;
revoke insert, update, delete on public.job_status_events from anon, authenticated;
grant select on public.job_status_events to authenticated;
