-- =====================================================================
-- FixLink Ethiopia — helpers for the pgTAP database tests
-- =====================================================================
-- These helpers live in their own schema so the public schema of the
-- real database stays untouched. The runner drops the schema when the
-- run is over.
--
-- They give the tests three things:
--
--   * `fixlink_test.create_user(...)` — a real `auth.users` row, so the
--     `on_auth_user_created` trigger creates the profile exactly as it
--     does for a real sign-up;
--   * `fixlink_test.as_user(...)` — the caller's identity, by setting the
--     `request.jwt.claims` GUC the way PostgREST does;
--   * `fixlink_test.as_anon()` — an anonymous request.
--
-- Every helper is SECURITY DEFINER, because the tests switch the
-- session to the `authenticated` role and the fixtures must still be
-- able to write `auth.users` and read the catalogue.
-- =====================================================================

create schema if not exists fixlink_test;

-- ---------------------------------------------------------------------
-- A user of the platform
-- ---------------------------------------------------------------------
create or replace function fixlink_test.create_user(
  p_email text,
  p_role public.user_role default 'customer',
  p_status public.account_status default 'active',
  p_professional boolean default false,
  p_verification public.verification_status default 'approved'
)
returns uuid
language plpgsql
security definer
set search_path = public, auth, extensions, fixlink_test
as $$
declare
  v_id uuid := extensions.gen_random_uuid();
  v_profile public.profiles;
begin
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    confirmation_token, email_change, email_change_token_new,
    recovery_token, created_at, updated_at
  )
  values (
    '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated',
    p_email, extensions.crypt('Test-Password-2026', extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('full_name', split_part(p_email, '@', 1)),
    '', '', '', '', now(), now()
  );

  -- The trigger has created the profile; set the fields a test needs.
  update public.profiles
     set role = p_role,
         account_status = p_status,
         email = p_email
   where auth_user_id = v_id
  returning * into v_profile;

  if p_professional then
    insert into public.professionals (
      profile_id, verification_status, accepts_requests, service_radius_km,
      base_area_name, base_location, years_of_experience
    )
    values (
      v_profile.id, p_verification, true, 25, 'Dire Dawa',
      extensions.st_setsrid(extensions.st_makepoint(9.6009, 41.8501), 4326)::extensions.geography,
      5
    );
  end if;

  return v_id;
end;
$$;

-- ---------------------------------------------------------------------
-- The caller's identity
-- ---------------------------------------------------------------------
-- PostgREST puts the decoded JWT in `request.jwt.claims`. The database
-- reads the `sub` claim from there, so setting the GUC is exactly what a
-- real request does.
--
-- `is_local = false`: the setting lasts for the session, and PostgreSQL
-- rolls it back when the surrounding transaction is rolled back — which
-- is what each test file does at the end.
create or replace function fixlink_test.as_user(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth, fixlink_test
as $$
begin
  perform set_config(
    'request.jwt.claims',
    json_build_object(
      'sub', p_user_id::text,
      'email', (select email from auth.users where id = p_user_id)
    )::text,
    false
  );
end;
$$;

-- ---------------------------------------------------------------------
-- An anonymous request
-- ---------------------------------------------------------------------
create or replace function fixlink_test.as_anon()
returns void
language plpgsql
security definer
set search_path = public, fixlink_test
as $$
begin
  perform set_config('request.jwt.claims', '{}', false);
end;
$$;

-- ---------------------------------------------------------------------
-- The profile of a user (the profile uuid, not the auth uuid)
-- ---------------------------------------------------------------------
create or replace function fixlink_test.profile_of(p_user_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public, fixlink_test
as $$
  select id from public.profiles where auth_user_id = p_user_id;
$$;

-- ---------------------------------------------------------------------
-- The auth user of an e-mail address
-- ---------------------------------------------------------------------
create or replace function fixlink_test.user_by_email(p_email text)
returns uuid
language sql
stable
security definer
set search_path = public, auth, fixlink_test
as $$
  select id from auth.users where email = p_email;
$$;

-- ---------------------------------------------------------------------
-- The professional row of a user
-- ---------------------------------------------------------------------
create or replace function fixlink_test.professional_of(p_user_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public, fixlink_test
as $$
  select id from public.professionals where profile_id = fixlink_test.profile_of(p_user_id);
$$;

-- ---------------------------------------------------------------------
-- A professional offers a category
-- ---------------------------------------------------------------------
-- A professional may only quote on a category they offer, so the
-- fixtures have to register the service.
create or replace function fixlink_test.offer_service(
  p_professional uuid,
  p_category uuid default null
)
returns void
language plpgsql
security definer
set search_path = public, fixlink_test
as $$
begin
  insert into public.professional_services (
    professional_id, category_id, starting_price_etb
  )
  values (
    p_professional,
    coalesce(p_category, fixlink_test.ensure_category()),
    1000
  )
  on conflict (professional_id, category_id) do nothing;
end;
$$;

-- ---------------------------------------------------------------------
-- A category, created if the catalogue is empty
-- ---------------------------------------------------------------------
create or replace function fixlink_test.ensure_category()
returns uuid
language plpgsql
security definer
set search_path = public, fixlink_test
as $$
declare
  v_id uuid;
begin
  select id into v_id
  from public.service_categories
  where slug = 'plumbing'
  limit 1;

  if v_id is null then
    insert into public.service_categories (slug, name, is_active, sort_order)
    values ('plumbing', 'Plumbing', true, 1)
    returning id into v_id;
  end if;

  return v_id;
end;
$$;

-- ---------------------------------------------------------------------
-- A request of a customer (created as the database owner, so the test
-- does not depend on the customer's own permissions)
-- ---------------------------------------------------------------------
create or replace function fixlink_test.create_job(
  p_customer uuid,
  p_title text default 'The tap in the kitchen is leaking',
  p_description text default 'The kitchen tap has been dripping for two days.'
)
returns uuid
language plpgsql
security definer
set search_path = public, fixlink_test
as $$
declare
  v_job uuid;
begin
  insert into public.job_requests (
    customer_id, category_id, title, description, area_name
  )
  values (
    fixlink_test.profile_of(p_customer),
    fixlink_test.ensure_category(),
    p_title,
    p_description,
    'Dire Dawa'
  )
  returning id into v_job;

  return v_job;
end;
$$;

-- ---------------------------------------------------------------------
-- The tests switch the session to the `authenticated` role, so the
-- helpers must be reachable from it.
-- ---------------------------------------------------------------------
grant usage on schema fixlink_test to authenticated, anon;
grant execute on all functions in schema fixlink_test to authenticated, anon;
