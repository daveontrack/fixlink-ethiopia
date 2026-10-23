-- =====================================================================
-- FixLink Ethiopia - 009: location-aware matching
-- =====================================================================
-- APPLY ORDER: this file comes AFTER quotations_and_bookings.sql, because
-- public.find_matching_professionals() is a LANGUAGE sql function and
-- PostgreSQL analyses its body (including the reference to
-- public.bookings) at CREATE time.
--
-- Ranking formula (SRS Section 10):
--
--   S = 0.35*D + 0.25*R + 0.20*Q + 0.10*A + 0.10*H
--
--   D  normalized geographic proximity
--   R  normalized review / verified-job rating
--   Q  normalized quotation responsiveness
--   A  normalized availability / workload
--   H  normalized relevant experience
--
-- Every component is normalized to [0,1] BEFORE weighting. The TypeScript
-- mirror of these formulas lives in packages/shared-types/src/matching.ts
-- and is covered by unit tests; the two implementations must agree.
--
-- Normalization (identical in SQL and TypeScript):
--
--   D = clamp01(1 - distanceKm / searchRadiusKm)
--       searchRadiusKm = min(professional.serviceRadiusKm, configured cap)
--       Professionals with service_radius_km < 1 are excluded by a CHECK
--       constraint, so the divisor is never zero.
--
--   R = averageRating / 5                      when totalReviews > 0
--     = 0.35                                   otherwise (neutral prior)
--
--   Q = responded / notified                   when notified > 0
--     = 0.5                                    otherwise (neutral prior)
--
--   A = clamp01(1 - activeBookings / maxConcurrentJobs)
--       `accepts_requests = false` is an ELIGIBILITY filter, not a score.
--
--   H = max(clamp01(yearsOfExperience / 15), clamp01(completedJobs / 50))
-- =====================================================================

-- ---------------------------------------------------------------------
-- Tunable configuration (single row, editable by an administrator)
-- ---------------------------------------------------------------------
create table if not exists public.matching_config (
  id integer primary key default 1 check (id = 1),
  batch_size integer not null default 5 check (batch_size between 1 and 50),
  timeout_minutes integer not null default 30 check (timeout_minutes between 1 and 1440),
  radius_expansion_km numeric(5, 2) not null default 5 check (radius_expansion_km > 0),
  max_search_radius_km numeric(5, 2) not null default 25 check (max_search_radius_km > 0),
  max_expansion_rounds integer not null default 3 check (max_expansion_rounds between 0 and 10),
  expiration_hours integer not null default 72 check (expiration_hours between 1 and 720),
  max_concurrent_jobs integer not null default 5 check (max_concurrent_jobs between 1 and 100),
  updated_at timestamptz not null default now()
);

insert into public.matching_config (id) values (1) on conflict (id) do nothing;

comment on table public.matching_config is
  'Runtime-tunable matching parameters. Mirrors DEFAULT_MATCHING_CONFIG in shared-types.';

alter table public.matching_config enable row level security;
drop policy if exists "matching_config_select_authenticated" on public.matching_config;
create policy "matching_config_select_authenticated"
  on public.matching_config
  for select
  to authenticated
  using (true);

drop policy if exists "matching_config_admin_write" on public.matching_config;
create policy "matching_config_admin_write"
  on public.matching_config
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant select on public.matching_config to authenticated;
grant update on public.matching_config to authenticated;

-- ---------------------------------------------------------------------
-- Matches: who was notified about which request, with the score
-- ---------------------------------------------------------------------
create table if not exists public.job_matches (
  id uuid primary key default extensions.gen_random_uuid(),
  job_id uuid not null references public.job_requests (id) on delete cascade,
  professional_id uuid not null references public.professionals (id) on delete cascade,
  batch_number integer not null default 1,
  rank integer not null default 0,
  score numeric(6, 5) not null check (score between 0 and 1),
  score_components jsonb not null default '{}'::jsonb,
  distance_km numeric(9, 3),
  notified_at timestamptz,
  response_status public.match_response_status not null default 'pending',
  created_at timestamptz not null default now(),
  -- A professional is notified at most once per request.
  unique (job_id, professional_id)
);

create index if not exists job_matches_job_idx
  on public.job_matches (job_id, score desc);
create index if not exists job_matches_professional_idx
  on public.job_matches (professional_id, created_at desc);
create index if not exists job_matches_pending_idx
  on public.job_matches (response_status, notified_at)
  where response_status = 'pending';

comment on table public.job_matches is
  'Notification ledger for the matching algorithm. Doubles as the dataset used to evaluate matching during the pilot.';

-- ---------------------------------------------------------------------
-- Background queue for the matching worker
-- ---------------------------------------------------------------------
create table if not exists public.matching_queue (
  id uuid primary key default extensions.gen_random_uuid(),
  job_id uuid not null references public.job_requests (id) on delete cascade,
  batch_number integer not null default 1,
  radius_km numeric(5, 2),
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'done', 'failed')),
  attempts integer not null default 0,
  last_error text,
  available_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

create index if not exists matching_queue_pending_idx
  on public.matching_queue (available_at)
  where status = 'pending';

-- ---------------------------------------------------------------------
-- Candidate scoring
-- ---------------------------------------------------------------------
-- Returns the eligible professionals for a request, ranked.
create or replace function public.find_matching_professionals(
  p_job_id uuid,
  p_radius_km numeric default null,
  p_limit int default null
)
returns table (
  professional_id uuid,
  distance_km numeric,
  score numeric,
  components jsonb
)
language sql
stable
security definer
set search_path = public
as $$
with cfg as (
  select * from public.matching_config where id = 1
),
j as (
  select
    jr.id,
    jr.category_id,
    jr.area_name,
    jr.sub_city_code,
    jr.location,
    cfg.max_search_radius_km,
    cfg.max_concurrent_jobs
  from public.job_requests jr
  cross join cfg
  where jr.id = p_job_id
),
-- Step 1: professionals who offer the requested category, are approved,
-- accept requests, and have a base location.
raw as (
  select
    pr.id as professional_id,
    pr.service_radius_km,
    pr.average_rating,
    pr.total_reviews,
    pr.years_of_experience,
    pr.completed_jobs,
    (extensions.st_distance(pr.base_location, j.location) / 1000.0)::numeric as distance_km,
    -- The professional is based in the same sub-city as the job.
    (pr.sub_city_code is not null and pr.sub_city_code = j.sub_city_code) as area_match,
    j.max_search_radius_km,
    j.max_concurrent_jobs
  -- `j` (the request) comes first: a JOIN condition may only reference
  -- relations that appear to its left, and professional_services is
  -- filtered on j.category_id.
  from j
  join public.professionals pr on true
  join public.professional_services ps
    on ps.professional_id = pr.id
   and ps.category_id = j.category_id
  where pr.verification_status = 'approved'
    and pr.accepts_requests
    and pr.service_radius_km >= 1
    and j.location is not null
    and pr.base_location is not null
    and extensions.st_dwithin(
      pr.base_location,
      j.location,
      j.max_search_radius_km * 1000
    )
),
-- Step 2: coverage. A professional covers the job when the job is inside
-- their radius, OR their named service area contains the job area and the
-- job is still inside the platform-wide search cap.
covered as (
  select
    r.*,
    least(r.service_radius_km, coalesce(p_radius_km, r.max_search_radius_km))
      as search_radius_km,
    (
      r.distance_km <= r.service_radius_km
      or (r.area_match and r.distance_km <= r.max_search_radius_km)
    ) as is_covered
  from raw r
),
scored as (
  select
    c.professional_id,
    c.distance_km,
    -- D
    case
      when c.search_radius_km <= 0 then 0
      else greatest(0, least(1, 1 - c.distance_km / c.search_radius_km))
    end as d_score,
    -- R
    case
      when c.total_reviews > 0 then greatest(0, least(1, coalesce(c.average_rating, 0) / 5))
      else 0.35
    end as r_score,
    -- Q
    case
      when coalesce(n.notification_count, 0) > 0
        then greatest(0, least(1, n.response_count::numeric / n.notification_count))
      else 0.5
    end as q_score,
    -- A
    case
      when c.max_concurrent_jobs <= 0 then 0
      else greatest(
        0,
        least(1, 1 - coalesce(b.active_bookings, 0)::numeric / c.max_concurrent_jobs)
      )
    end as a_score,
    -- H
    greatest(
      greatest(0, least(1, c.years_of_experience::numeric / 15)),
      greatest(0, least(1, c.completed_jobs::numeric / 50))
    ) as h_score,
    coalesce(b.active_bookings, 0) as active_bookings
  from covered c
  left join lateral (
    select
      count(*)::int as notification_count,
      count(*) filter (where m.response_status in ('viewed', 'quoted'))::int as response_count
    from public.job_matches m
    where m.professional_id = c.professional_id
  ) n on true
  left join lateral (
    select count(*)::int as active_bookings
    from public.bookings bk
    where bk.professional_id = c.professional_id
      and bk.status in ('booked', 'in_progress')
  ) b on true
  where c.is_covered
)
select
  s.professional_id,
  s.distance_km,
  round(
    (0.35 * s.d_score + 0.25 * s.r_score + 0.20 * s.q_score
     + 0.10 * s.a_score + 0.10 * s.h_score)::numeric,
    5
  ) as score,
  jsonb_build_object(
    'D', round(s.d_score::numeric, 5),
    'R', round(s.r_score::numeric, 5),
    'Q', round(s.q_score::numeric, 5),
    'A', round(s.a_score::numeric, 5),
    'H', round(s.h_score::numeric, 5)
  ) as components
from scored s
order by score desc, s.distance_km asc
limit coalesce(p_limit, 100);
$$;

comment on function public.find_matching_professionals(uuid, numeric, int) is
  'Eligible, scored professionals for a job request, ranked best first.';

-- ---------------------------------------------------------------------
-- Notify a batch of the highest ranked candidates
-- ---------------------------------------------------------------------
create or replace function public.match_job(
  p_job_id uuid,
  p_batch_size int default null,
  p_radius_km numeric default null,
  p_batch_number int default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.current_profile_id();
  v_job public.job_requests;
  v_cfg public.matching_config;
  v_limit int;
  v_batch int;
  v_notified integer := 0;
  v_row record;
begin
  if v_actor is not null
     and not public.is_admin()
     and not exists (
       select 1 from public.job_requests jr
       where jr.id = p_job_id and jr.customer_id = v_actor
     )
  then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select * into v_job from public.job_requests where id = p_job_id for update;
  if not found then
    raise exception 'job_not_found' using errcode = 'P0002';
  end if;

  if v_job.status not in ('open', 'matching', 'quoted') then
    raise exception 'job_not_matchable' using errcode = '22023';
  end if;

  select * into v_cfg from public.matching_config where id = 1;
  v_limit := coalesce(p_batch_size, v_cfg.batch_size);
  v_batch := coalesce(p_batch_number, 1);

  -- Notify professionals that have NOT been notified for this request yet.
  for v_row in
    with existing as (
      select professional_id from public.job_matches where job_id = p_job_id
    ),
    candidates as (
      select * from public.find_matching_professionals(p_job_id, p_radius_km, v_limit * 4)
    ),
    fresh as (
      select c.*
      from candidates c
      where not exists (
        select 1 from existing e where e.professional_id = c.professional_id
      )
      order by c.score desc
      limit v_limit
    ),
    inserted as (
      insert into public.job_matches (
        job_id, professional_id, batch_number, rank, score,
        score_components, distance_km, notified_at, response_status
      )
      select
        p_job_id, f.professional_id, v_batch,
        row_number() over (order by f.score desc),
        f.score, f.components, f.distance_km, now(), 'pending'
      from fresh f
      returning id, professional_id, score
    )
    select * from inserted
  loop
    perform public.notify(
      (select profile_id from public.professionals where id = v_row.professional_id),
      'job.match_available',
      'New job request near you',
      format('A %s job request in %s is available. Review it and send a quotation.',
        (select sc.name from public.service_categories sc where sc.id = v_job.category_id),
        v_job.area_name),
      jsonb_build_object('jobId', v_job.id, 'matchId', v_row.id),
      format('match:%s:%s', v_job.id, v_row.professional_id)
    );

    v_notified := v_notified + 1;
  end loop;

  if v_notified > 0 then
    update public.job_requests
       set status = 'matching',
           match_score = greatest(coalesce(match_score, 0), 0)
     where id = p_job_id
     and status = 'open';

    if v_job.status = 'open' then
      insert into public.job_status_events (
        job_id, actor_id, actor_role, from_status, to_status, note
      )
      values (
        p_job_id, v_actor, 'system', 'open', 'matching',
        format('Notified %s professional(s)', v_notified)
      );
    end if;
  end if;

  return v_notified;
end;
$$;

comment on function public.match_job(uuid, int, numeric, int) is
  'Notify the highest ranked eligible professionals for a request. Returns how many were newly notified.';

-- ---------------------------------------------------------------------
-- Queue a request for the background matching worker
-- ---------------------------------------------------------------------
create or replace function public.request_matching(
  p_job_id uuid,
  p_batch_number int default 1
)
returns public.matching_queue
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.current_profile_id();
  v_row public.matching_queue;
begin
  if v_actor is not null
     and not public.is_admin()
     and not exists (
       select 1 from public.job_requests jr
       where jr.id = p_job_id and jr.customer_id = v_actor
     )
  then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  insert into public.matching_queue (job_id, batch_number)
  values (p_job_id, coalesce(p_batch_number, 1))
  on conflict do nothing
  returning * into v_row;

  return v_row;
end;
$$;

-- ---------------------------------------------------------------------
-- Expand the search after a timeout with no usable response
-- ---------------------------------------------------------------------
create or replace function public.expand_matching(
  p_job_id uuid
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.current_profile_id();
  v_job public.job_requests;
  v_cfg public.matching_config;
  v_radius numeric;
  v_batch int;
  v_notified integer;
  v_rounds integer;
begin
  if v_actor is not null and not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select * into v_job from public.job_requests where id = p_job_id for update;
  if not found then
    raise exception 'job_not_found' using errcode = 'P0002';
  end if;

  select * into v_cfg from public.matching_config where id = 1;

  select count(distinct batch_number) into v_rounds
  from public.job_matches
  where job_id = p_job_id;

  if v_rounds >= v_cfg.max_expansion_rounds then
    -- No more rounds: the request is left open for manual review and
    -- eventually expired by the maintenance job.
    insert into public.job_status_events (
      job_id, actor_id, actor_role, from_status, to_status, note
    )
    values (
      p_job_id, v_actor, 'system', v_job.status, v_job.status,
      'Maximum matching expansion rounds reached'
    );
    return 0;
  end if;

  v_batch := v_rounds + 1;
  v_radius := least(
    v_cfg.max_search_radius_km,
    v_cfg.radius_expansion_km * v_batch
  );

  v_notified := public.match_job(p_job_id, v_cfg.batch_size, v_radius, v_batch);

  insert into public.job_status_events (
    job_id, actor_id, actor_role, from_status, to_status, note
  )
  values (
    p_job_id, v_actor, 'system', v_job.status, v_job.status,
    format('Matching expanded to round %s (radius %s km), %s new professional(s)',
      v_batch, v_radius, v_notified)
  );

  return v_notified;
end;
$$;

-- ---------------------------------------------------------------------
-- Keep the professional response rate up to date
-- ---------------------------------------------------------------------
create or replace function public.refresh_professional_response_rate()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.professionals p
     set quotation_response_rate = sub.rate
  from (
    select
      count(*)::numeric as total,
      count(*) filter (where m.response_status in ('viewed', 'quoted'))::numeric as responded
    from public.job_matches m
    where m.professional_id = new.professional_id
  ) sub
  where p.id = new.professional_id
    and sub.total > 0
    and sub.responded / sub.total <> coalesce(p.quotation_response_rate, -1);

  return new;
end;
$$;

drop trigger if exists job_matches_refresh_rate on public.job_matches;
create trigger job_matches_refresh_rate
  after insert or update of response_status on public.job_matches
  for each row execute function public.refresh_professional_response_rate();

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------
alter table public.job_matches enable row level security;

drop policy if exists "job_matches_select_participants" on public.job_matches;
create policy "job_matches_select_participants"
  on public.job_matches
  for select
  to authenticated
  using (
    professional_id = public.current_professional_id()
    or public.is_admin()
    or exists (
      select 1 from public.job_requests j
      where j.id = job_matches.job_id
        and j.customer_id = public.current_profile_id()
    )
  );

revoke insert, update, delete on public.job_matches from anon, authenticated;
grant select on public.job_matches to authenticated;

alter table public.matching_queue enable row level security;
revoke all on public.matching_queue from anon, authenticated;
