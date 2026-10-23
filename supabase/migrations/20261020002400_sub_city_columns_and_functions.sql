-- =====================================================================
-- FixLink Ethiopia - 024: the sub-city columns and the functions
-- =====================================================================
-- The tables of the platform are located by the sub-city of the Dire Dawa
-- administration (see 20261020000250_sub_cities.sql).
--
-- The columns and the functions were introduced together with the table,
-- but they are applied here as well: the database that already runs the
-- first migrations of the project gets the sub-city support without
-- touching them.
--
-- A request and a professional carry the code of their sub-city; the name
-- and the point of the map are copied from the reference table, so they
-- are never collected from a visitor.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. The columns
-- ---------------------------------------------------------------------
alter table public.job_requests
  add column if not exists sub_city_code text;

alter table public.professionals
  add column if not exists sub_city_code text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'job_requests_sub_city_code_fkey'
  ) then
    alter table public.job_requests
      add constraint job_requests_sub_city_code_fkey
      foreign key (sub_city_code) references public.sub_cities (code);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'professionals_sub_city_code_fkey'
  ) then
    alter table public.professionals
      add constraint professionals_sub_city_code_fkey
      foreign key (sub_city_code) references public.sub_cities (code);
  end if;
end
$$;

-- The rows that already exist point at the sub-city of their area name,
-- when there is one. The others stay empty until they are filled in.
update public.job_requests jr
   set sub_city_code = sc.code
  from public.sub_cities sc
 where jr.sub_city_code is null
   and lower(sc.name) = lower(jr.area_name);

update public.professionals pr
   set sub_city_code = sc.code
  from public.sub_cities sc
 where pr.sub_city_code is null
   and lower(sc.name) = lower(pr.base_area_name);

-- ---------------------------------------------------------------------
-- 2. The request is created from the sub-city
-- ---------------------------------------------------------------------
drop function if exists public.create_job_request(
  uuid, text, text, text, double precision, double precision,
  public.location_source, public.job_priority, text
);

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
  'Create a service request for the signed-in customer. The sub-city gives the area and the point of the map.';

-- ---------------------------------------------------------------------
-- 3. The request can be moved to another sub-city
-- ---------------------------------------------------------------------
drop function if exists public.update_job_request(
  uuid, text, text, text, double precision, double precision, public.job_priority
);

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

comment on function public.update_job_request(uuid, text, text, text, public.job_priority) is
  'Edit a request that is not booked yet. The sub-city gives the area and the point of the map.';

-- ---------------------------------------------------------------------
-- 4. The professional works in a sub-city
-- ---------------------------------------------------------------------
drop function if exists public.update_professional_profile(
  text, integer, boolean, numeric, text, double precision, double precision
);

create or replace function public.update_professional_profile(
  p_bio text default null,
  p_years_of_experience int default null,
  p_accepts_requests boolean default null,
  p_service_radius_km numeric default null,
  p_base_sub_city_code text default null
)
returns public.professionals
language plpgsql
security definer
set search_path = public
as $$
declare
  v_professional_id uuid := public.current_professional_id();
  v_row public.professionals;
begin
  if v_professional_id is null then
    raise exception 'not_a_professional' using errcode = '42501';
  end if;

  -- The base of a professional is a sub-city: the name and the point come
  -- from the reference table, never from the client.
  if p_base_sub_city_code is not null
     and not exists (
       select 1 from public.sub_cities where code = p_base_sub_city_code
     ) then
    raise exception 'unknown_sub_city' using errcode = '22023';
  end if;

  update public.professionals
     set bio = coalesce(p_bio, bio),
         years_of_experience = coalesce(
           p_years_of_experience,
           years_of_experience
         ),
         accepts_requests = coalesce(p_accepts_requests, accepts_requests),
         service_radius_km = coalesce(
           greatest(1, least(100, p_service_radius_km)),
           service_radius_km
         ),
         sub_city_code = coalesce(p_base_sub_city_code, sub_city_code),
         base_area_name = coalesce(
           (select sc.name from public.sub_cities sc where sc.code = p_base_sub_city_code),
           base_area_name
         ),
         base_location = coalesce(
           (select sc.location from public.sub_cities sc where sc.code = p_base_sub_city_code),
           base_location
         )
   where id = v_professional_id
   returning * into v_row;

  return v_row;
end;
$$;

comment on function public.update_professional_profile(text, integer, boolean, numeric, text) is
  'Update the fields a professional may change themselves. The base sub-city gives the area and the point of the map.';

-- ---------------------------------------------------------------------
-- 5. The public directory shows the sub-city
-- ---------------------------------------------------------------------
-- The view is dropped and created again: a column was added to it, and
-- `create or replace view` cannot change the columns of a view.
drop view if exists public.professional_locations;

create view public.professional_locations as
select
  pr.id as professional_id,
  pr.profile_id,
  p.full_name,
  p.avatar_url,
  pr.base_area_name,
  pr.sub_city_code,
  pr.verification_status,
  pr.accepts_requests,
  pr.service_radius_km,
  pr.years_of_experience,
  pr.average_rating,
  pr.total_reviews,
  pr.completed_jobs,
  case
    when pr.base_location is not null
      then extensions.st_y(pr.base_location::extensions.geometry)
  end as latitude,
  case
    when pr.base_location is not null
      then extensions.st_x(pr.base_location::extensions.geometry)
  end as longitude,
  (
    select json_agg(
      json_build_object(
        'id', ps.category_id,
        'slug', sc.slug,
        'name', sc.name,
        'name_am', sc.name_am,
        'name_om', sc.name_om
      )
      order by sc.sort_order
    )
    from public.professional_services ps
    join public.service_categories sc on sc.id = ps.category_id
    where ps.professional_id = pr.id
  ) as categories
from public.professionals pr
join public.profiles p on p.id = pr.profile_id
where pr.verification_status = 'approved';

revoke all on public.professional_locations from anon;
grant select on public.professional_locations to anon, authenticated;
