-- =====================================================================
-- FixLink Ethiopia - 004: professionals, services, service areas
-- =====================================================================
-- A "professional" is a profile with one extra 1:1 row. The row carries
-- the marketplace state that the platform owns: verification status,
-- availability toggle, service radius, and the denormalised rating
-- summary used by the matching formula.
--
-- The owner may change: bio, years of experience, availability, radius,
-- base area/location, offered categories and named service areas.
-- The owner may NOT change: verification status, rating summary,
-- completed job count, or any administrative flag.
-- =====================================================================

create table if not exists public.professionals (
  id uuid primary key default extensions.gen_random_uuid(),
  profile_id uuid not null unique references public.profiles (id) on delete cascade,
  bio text check (char_length(bio) <= 2000),
  years_of_experience integer not null default 0
    check (years_of_experience between 0 and 60),
  verification_status public.verification_status not null default 'pending',
  -- Availability toggle. Gates ELIGIBILITY for matching.
  -- Distinct from workload (how many bookings are already active).
  accepts_requests boolean not null default true,
  -- Coverage radius in km. CHECK >= 1 guarantees the matching formula
  -- never divides by zero.
  service_radius_km numeric(5, 2) not null default 10
    check (service_radius_km >= 1 and service_radius_km <= 100),
  -- The sub-city of Dire Dawa the professional is based in. It is the only
  -- location a professional is asked for: no coordinates.
  sub_city_code text references public.sub_cities (code),
  base_area_name text check (char_length(base_area_name) <= 120),
  -- The point of that sub-city. Never collected: it comes from
  -- `public.sub_cities` and is only used to measure the distance between
  -- two sub-cities during the matching.
  base_location extensions.geography(point, 4326),
  -- Denormalised rating summary, maintained by a trigger on `reviews`.
  average_rating numeric(3, 2) check (average_rating between 0 and 5),
  total_reviews integer not null default 0 check (total_reviews >= 0),
  completed_jobs integer not null default 0 check (completed_jobs >= 0),
  -- 0..1 share of match notifications that led to a quotation.
  quotation_response_rate numeric(4, 3) check (quotation_response_rate between 0 and 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column public.professionals.service_radius_km is
  'Coverage radius in km. Must be >= 1: the matching formula divides by it.';
comment on column public.professionals.accepts_requests is
  'Availability toggle. Gates matching eligibility; workload is tracked separately.';

create index if not exists professionals_verification_idx
  on public.professionals (verification_status, accepts_requests);
create index if not exists professionals_base_location_idx
  on public.professionals using gist (base_location);

-- ---------------------------------------------------------------------
-- Categories a professional offers
-- ---------------------------------------------------------------------
create table if not exists public.professional_services (
  professional_id uuid not null references public.professionals (id) on delete cascade,
  category_id uuid not null references public.service_categories (id) on delete cascade,
  starting_price_etb numeric(12, 2) check (starting_price_etb is null or starting_price_etb >= 0),
  created_at timestamptz not null default now(),
  primary key (professional_id, category_id)
);

create index if not exists professional_services_category_idx
  on public.professional_services (category_id);

-- ---------------------------------------------------------------------
-- Named areas a professional covers (Dire Dawa kebeles / neighbourhoods)
-- ---------------------------------------------------------------------
create table if not exists public.service_areas (
  id uuid primary key default extensions.gen_random_uuid(),
  professional_id uuid not null references public.professionals (id) on delete cascade,
  area_name text not null check (char_length(area_name) between 2 and 120),
  created_at timestamptz not null default now(),
  unique (professional_id, area_name)
);

create index if not exists service_areas_professional_idx
  on public.service_areas (professional_id);

-- ---------------------------------------------------------------------
-- Helper functions
-- ---------------------------------------------------------------------
create or replace function public.current_professional_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select pr.id
  from public.professionals pr
  where pr.profile_id = public.current_profile_id()
  limit 1;
$$;

comment on function public.current_professional_id() is
  'professionals.id of the signed-in professional, or NULL when the caller is not a professional.';

create or replace function public.is_professional()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.professionals where profile_id = public.current_profile_id()
  );
$$;

-- ---------------------------------------------------------------------
-- Customer -> professional upgrade
-- ---------------------------------------------------------------------
create or replace function public.start_as_professional(
  p_years_of_experience int default 0,
  p_bio text default null
)
returns public.professionals
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.current_profile_id();
  v_profile public.profiles;
  v_professional public.professionals;
begin
  if v_actor is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  select * into v_profile from public.profiles where id = v_actor for update;

  if v_profile.role = 'admin' then
    raise exception 'admin_role_immutable' using errcode = '42501';
  end if;

  select * into v_professional
  from public.professionals
  where profile_id = v_actor;

  if found then
    return v_professional;
  end if;

  insert into public.professionals (profile_id, years_of_experience, bio)
  values (
    v_actor,
    greatest(0, least(60, coalesce(p_years_of_experience, 0))),
    nullif(btrim(coalesce(p_bio, '')), '')
  )
  returning * into v_professional;

  update public.professionals
     set verification_status = 'pending'
   where id = v_professional.id;

  update public.profiles
     set role = 'professional'
   where id = v_actor;

  return v_professional;
end;
$$;

comment on function public.start_as_professional(int, text) is
  'Upgrade the signed-in customer to a professional. Verification starts as pending; admin role is never granted.';

-- ---------------------------------------------------------------------
-- Update the permitted professional fields (single trusted entry point)
-- ---------------------------------------------------------------------
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

-- ---------------------------------------------------------------------
-- Replace the offered categories (full replace, validated server-side)
-- ---------------------------------------------------------------------
create or replace function public.set_professional_services(
  p_services jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_professional_id uuid := public.current_professional_id();
  v_item jsonb;
  v_category uuid;
  v_price numeric;
  v_count integer := 0;
begin
  if v_professional_id is null then
    raise exception 'not_a_professional' using errcode = '42501';
  end if;

  if p_services is null or jsonb_typeof(p_services) <> 'array' then
    raise exception 'invalid_services_payload' using errcode = '22023';
  end if;

  if jsonb_array_length(p_services) < 1 or jsonb_array_length(p_services) > 20 then
    raise exception 'invalid_services_count' using errcode = '22023';
  end if;

  delete from public.professional_services where professional_id = v_professional_id;

  for v_item in select * from jsonb_array_elements(p_services)
  loop
    v_category := (v_item ->> 'categoryId')::uuid;
    v_price := nullif(v_item ->> 'startingPriceEtb', '')::numeric;

    if v_price is not null and v_price < 0 then
      raise exception 'negative_price' using errcode = '22023';
    end if;

    if not exists (
      select 1 from public.service_categories
      where id = v_category and is_active
    ) then
      raise exception 'inactive_category' using errcode = '22023';
    end if;

    insert into public.professional_services (professional_id, category_id, starting_price_etb)
    values (v_professional_id, v_category, v_price);

    v_count := v_count + 1;
  end loop;
end;
$$;

-- ---------------------------------------------------------------------
-- Replace the named service areas
-- ---------------------------------------------------------------------
create or replace function public.set_service_areas(
  p_area_names text[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_professional_id uuid := public.current_professional_id();
  v_area text;
begin
  if v_professional_id is null then
    raise exception 'not_a_professional' using errcode = '42501';
  end if;

  if p_area_names is null or array_length(p_area_names, 1) is null
     or array_length(p_area_names, 1) < 1 or array_length(p_area_names, 1) > 30 then
    raise exception 'invalid_areas_count' using errcode = '22023';
  end if;

  delete from public.service_areas where professional_id = v_professional_id;

  foreach v_area in array p_area_names
  loop
    if length(btrim(v_area)) < 2 or length(btrim(v_area)) > 120 then
      raise exception 'invalid_area_name' using errcode = '22023';
    end if;

    insert into public.service_areas (professional_id, area_name)
    values (v_professional_id, btrim(v_area))
    on conflict (professional_id, area_name) do nothing;
  end loop;
end;
$$;

-- ---------------------------------------------------------------------
-- Defence in depth: protected professional columns
-- ---------------------------------------------------------------------
create or replace function public.protect_professional_columns()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.verification_status is distinct from old.verification_status
     or new.average_rating is distinct from old.average_rating
     or new.total_reviews is distinct from old.total_reviews
     or new.completed_jobs is distinct from old.completed_jobs
     or new.quotation_response_rate is distinct from old.quotation_response_rate
     or new.profile_id is distinct from old.profile_id
  then
    -- The trigger function is NOT `security definer`, so `current_user` is
    -- the role the statement really runs as: `postgres` inside a trusted
    -- SECURITY DEFINER function, `authenticated` for a direct API write.
    if not public.is_admin()
       and current_user not in ('service_role', 'postgres', 'supabase_admin')
    then
      raise exception 'protected_professional_field' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists professionals_protect_columns on public.professionals;
create trigger professionals_protect_columns
  before update on public.professionals
  for each row execute function public.protect_professional_columns();

drop trigger if exists professionals_set_updated_at on public.professionals;
create trigger professionals_set_updated_at
  before update on public.professionals
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------
alter table public.professionals enable row level security;

-- Public profile cards: approved professionals are visible to everyone,
-- pending/rejected ones only to their owner and to administrators.
drop policy if exists "professionals_select_public" on public.professionals;
create policy "professionals_select_public"
  on public.professionals
  for select
  to anon, authenticated
  using (
    verification_status = 'approved'
    or profile_id = public.current_profile_id()
    or public.is_admin()
  );

drop policy if exists "professionals_insert_own" on public.professionals;
create policy "professionals_insert_own"
  on public.professionals
  for insert
  to authenticated
  with check (profile_id = public.current_profile_id());

-- Column-level grants below mean an owner can never write the protected
-- columns even though the UPDATE policy allows the row.
drop policy if exists "professionals_update_own" on public.professionals;
create policy "professionals_update_own"
  on public.professionals
  for update
  to authenticated
  using (profile_id = public.current_profile_id() or public.is_admin())
  with check (profile_id = public.current_profile_id() or public.is_admin());

revoke update on public.professionals from anon, authenticated;
grant update (bio, years_of_experience, accepts_requests, service_radius_km, sub_city_code, base_area_name, base_location)
  on public.professionals to authenticated;
grant select on public.professionals to anon, authenticated;

-- ---------------------------------------------------------------------
alter table public.professional_services enable row level security;

drop policy if exists "professional_services_select" on public.professional_services;
create policy "professional_services_select"
  on public.professional_services
  for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.professionals pr
      where pr.id = professional_id
        and (pr.verification_status = 'approved'
             or pr.profile_id = public.current_profile_id()
             or public.is_admin())
    )
  );

drop policy if exists "professional_services_write_own" on public.professional_services;
create policy "professional_services_write_own"
  on public.professional_services
  for all
  to authenticated
  using (
    exists (
      select 1 from public.professionals pr
      where pr.id = professional_id and pr.profile_id = public.current_profile_id()
    )
  )
  with check (
    exists (
      select 1 from public.professionals pr
      where pr.id = professional_id and pr.profile_id = public.current_profile_id()
    )
  );

grant select on public.professional_services to anon, authenticated;
grant insert, update, delete on public.professional_services to authenticated;

-- ---------------------------------------------------------------------
alter table public.service_areas enable row level security;

drop policy if exists "service_areas_select" on public.service_areas;
create policy "service_areas_select"
  on public.service_areas
  for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.professionals pr
      where pr.id = professional_id
        and (pr.verification_status = 'approved'
             or pr.profile_id = public.current_profile_id()
             or public.is_admin())
    )
  );

drop policy if exists "service_areas_write_own" on public.service_areas;
create policy "service_areas_write_own"
  on public.service_areas
  for all
  to authenticated
  using (
    exists (
      select 1 from public.professionals pr
      where pr.id = professional_id and pr.profile_id = public.current_profile_id()
    )
  )
  with check (
    exists (
      select 1 from public.professionals pr
      where pr.id = professional_id and pr.profile_id = public.current_profile_id()
    )
  );

grant select on public.service_areas to anon, authenticated;
grant insert, update, delete on public.service_areas to authenticated;
