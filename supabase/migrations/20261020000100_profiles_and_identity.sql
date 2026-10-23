-- =====================================================================
-- FixLink Ethiopia — 002: profiles, identity, auth helpers, RLS
-- =====================================================================
-- Identity model
-- --------------
-- Supabase Auth is the ONLY authentication system (the SRS fixes Supabase
-- as the selected backend and identity system). The browser/mobile app
-- signs in with Supabase Auth, Supabase issues a JWT, and the client
-- sends that JWT to PostgREST as `Authorization: Bearer <token>`.
-- PostgREST exposes the decoded claims through `request.jwt.claims`; the
-- `sub` claim is the Supabase Auth user id (a UUID).
--
-- `profiles.id` is a UUID that every other table references, so foreign
-- keys stay stable even if the identity provider changes later.
-- `profiles.auth_user_id` links the profile to `auth.users.id`.
--
-- IMPORTANT: `profiles.id` is NOT the auth user id. It stays an
-- independent UUID so that deleting an auth user cannot silently
-- cascade-delete the marketplace history (requests, bookings, messages).
-- The link is `on delete set null`, which deactivates the identity while
-- the audit trail survives.
--
-- A profile row is created in two ways, both idempotent:
--   1. the `on_auth_user_created` trigger on `auth.users` (sign-up), and
--   2. `public.ensure_profile()`, called by both clients on first load.
-- =====================================================================

create table if not exists public.profiles (
  id uuid primary key default extensions.gen_random_uuid(),
  -- The Supabase Auth user id (auth.users.id). Written once, never changed.
  auth_user_id uuid unique references auth.users (id) on delete set null,
  -- A copy of auth.users.email, kept so the apps can show and mail the
  -- address without a service-role call. Synced by the trigger and by
  -- ensure_profile() from the JWT `email` claim.
  email text,
  full_name text not null default 'FixLink user'
    check (char_length(full_name) between 2 and 100),
  role public.user_role not null default 'customer',
  phone text,
  avatar_url text,
  preferred_language public.language_code not null default 'en',
  account_status public.account_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column public.profiles.auth_user_id is
  'The Supabase Auth user id (auth.users.id). The single source of identity. Set to NULL if the auth user is deleted.';
comment on column public.profiles.email is
  'A copy of auth.users.email, synced from the auth trigger and from the JWT email claim.';
comment on column public.profiles.role is
  'customer | professional | admin. Admins are NEVER self-assignable.';
comment on column public.profiles.account_status is
  'active | suspended | closed. Only administrators may change this.';

create index if not exists profiles_role_idx on public.profiles (role);
create index if not exists profiles_account_status_idx on public.profiles (account_status);
create index if not exists profiles_auth_user_id_idx on public.profiles (auth_user_id);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Auth helper functions
-- ---------------------------------------------------------------------
-- The Supabase Auth user id of the caller, or NULL when signed out.
--
-- The `sub` claim is read from `request.jwt.claim.sub` (set by PostgREST)
-- with a fallback to the full `request.jwt.claims` document. The cast is
-- guarded: a non-UUID `sub` (for example from a misconfigured third-party
-- issuer) yields NULL instead of raising, so an anonymous or malformed
-- request is simply "not signed in" rather than an error.
create or replace function public.current_auth_user_id()
returns uuid
language plpgsql
stable
as $$
declare
  v_raw text;
begin
  v_raw := coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  );

  if v_raw is null or v_raw = '' then
    return null;
  end if;

  return v_raw::uuid;
exception
  when invalid_text_representation then
    return null;
end;
$$;

comment on function public.current_auth_user_id() is
  'Supabase Auth user id of the caller (request.jwt.claims.sub). NULL when signed out.';

-- The e-mail address of the caller, taken from the JWT `email` claim.
create or replace function public.current_auth_email()
returns text
language sql
stable
as $$
  select nullif(
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'email'),
    ''
  );
$$;

comment on function public.current_auth_email() is
  'E-mail address of the caller from the JWT email claim. NULL when absent.';

-- The profiles.id (UUID) of the caller, or NULL when signed out.
-- SECURITY DEFINER so that reading `profiles` from inside a profiles
-- RLS policy does not recurse infinitely.
create or replace function public.current_profile_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.id
  from public.profiles p
  where p.auth_user_id = public.current_auth_user_id()
  limit 1;
$$;

comment on function public.current_profile_id() is
  'profiles.id of the signed-in user, or NULL when signed out.';

-- The profiles.role of the caller, or NULL when signed out.
create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select p.role
  from public.profiles p
  where p.auth_user_id = public.current_auth_user_id()
  limit 1;
$$;

-- True only for an ACTIVE administrator.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.auth_user_id = public.current_auth_user_id()
      and p.role = 'admin'
      and p.account_status = 'active'
  );
$$;

comment on function public.is_admin() is
  'True when the caller is an active administrator. Used by every privileged policy.';

-- True when the caller owns an active (not suspended / not closed) account.
create or replace function public.is_active_account()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.auth_user_id = public.current_auth_user_id()
      and p.account_status = 'active'
  );
$$;

-- ---------------------------------------------------------------------
-- Profile creation on sign-up
-- ---------------------------------------------------------------------
-- Every Supabase Auth sign-up inserts an `auth.users` row. This trigger
-- creates the matching profile, so the profile always exists and the
-- `auth_user_id` link can never be forgotten by a client.
--
-- SECURITY DEFINER: the trigger runs as its owner (a privileged role), so
-- it can insert into `profiles` even though the application roles may not.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
begin
  v_name := coalesce(
    nullif(btrim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), ''),
    nullif(btrim(coalesce(new.raw_user_meta_data ->> 'name', '')), ''),
    nullif(btrim(split_part(coalesce(new.email, ''), '@', 1)), ''),
    'FixLink user'
  );

  -- The column is CHECKed to 2..100 characters, so a one-character name
  -- (or an e-mail local part of one letter) must not break the sign-up.
  if char_length(v_name) < 2 then
    v_name := 'FixLink user';
  end if;
  if char_length(v_name) > 100 then
    v_name := left(v_name, 100);
  end if;

  insert into public.profiles (auth_user_id, email, full_name, phone, avatar_url)
  values (
    new.id,
    new.email,
    v_name,
    new.phone,
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (auth_user_id) do nothing;

  return new;
end;
$$;

comment on function public.handle_new_user() is
  'Creates the profile of a new Supabase Auth user. Idempotent.';

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- Profile creation (idempotent, called by both clients on first load)
-- ---------------------------------------------------------------------
-- SECURITY DEFINER: the client may not insert into `profiles` directly
-- (that would allow choosing `role`, `account_status`, or another
-- user's `auth_user_id`). This function fixes all of those server-side.
create or replace function public.ensure_profile(
  p_full_name text default null,
  p_phone text default null,
  p_avatar_url text default null
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_auth_user_id uuid := public.current_auth_user_id();
  v_email text := public.current_auth_email();
  v_profile public.profiles;
  v_name text := nullif(btrim(coalesce(p_full_name, '')), '');
begin
  if v_auth_user_id is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  select * into v_profile
  from public.profiles
  where auth_user_id = v_auth_user_id;

  if not found then
    -- The sign-up trigger normally created the row already; this INSERT
    -- covers a profile that was deleted (or an account created before the
    -- trigger existed).
    insert into public.profiles (auth_user_id, email, full_name, phone, avatar_url)
    values (
      v_auth_user_id,
      v_email,
      coalesce(v_name, 'FixLink user'),
      p_phone,
      p_avatar_url
    )
    on conflict (auth_user_id) do update
      set email = coalesce(excluded.email, public.profiles.email)
      returning * into v_profile;

    if v_profile.id is null then
      select * into v_profile
      from public.profiles
      where auth_user_id = v_auth_user_id;
    end if;
  else
    -- Only the editable fields are touched. role / account_status /
    -- auth_user_id are deliberately NOT part of this update.
    update public.profiles
       set full_name = coalesce(v_name, full_name),
           phone = coalesce(p_phone, phone),
           avatar_url = coalesce(p_avatar_url, avatar_url),
           email = coalesce(v_email, email)
     where id = v_profile.id
     returning * into v_profile;
  end if;

  return v_profile;
end;
$$;

comment on function public.ensure_profile(text, text, text) is
  'Create or refresh the profile of the signed-in Supabase Auth user. Idempotent. Never changes role or account_status.';

-- NOTE: public.start_as_professional() is created in migration
-- 20261020000300_professionals.sql because it depends on the
-- `professionals` table.

-- ---------------------------------------------------------------------
-- Defence in depth: protected columns cannot be changed by the owner
-- ---------------------------------------------------------------------
-- Column-level GRANTs (below) already stop a user from writing `role`.
-- This trigger is the second line of defence in case grants are widened.
--
-- The trigger function is deliberately NOT `security definer`: it must
-- see the role the statement really runs as. An invoker-rights trigger
-- reports the effective `current_user`, which is:
--
--   * `postgres` / `supabase_admin` inside a SECURITY DEFINER function
--     (the trusted write path, e.g. set_account_status), and
--   * `authenticated` / `anon` for a direct write from the API,
--
-- so a client can never reach the protected columns, not even through a
-- raw PostgREST call.
create or replace function public.protect_profile_columns()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.role is distinct from old.role
     or new.account_status is distinct from old.account_status
     or new.auth_user_id is distinct from old.auth_user_id
  then
    if not public.is_admin()
       and current_user not in ('service_role', 'postgres', 'supabase_admin')
    then
      raise exception 'protected_profile_field' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_protect_columns on public.profiles;
create trigger profiles_protect_columns
  before update on public.profiles
  for each row execute function public.protect_profile_columns();

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------
alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles
  for select
  to authenticated
  using (id = public.current_profile_id());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles
  for update
  to authenticated
  using (id = public.current_profile_id())
  with check (id = public.current_profile_id());

-- Administrators may read every profile (needed by the admin dashboard).
drop policy if exists "profiles_select_admin" on public.profiles;
create policy "profiles_select_admin"
  on public.profiles
  for select
  to authenticated
  using (public.is_admin());

-- Nobody may delete a profile through the public API. Accounts are
-- closed by an administrator so the audit trail survives.
drop policy if exists "profiles_delete_admin" on public.profiles;
create policy "profiles_delete_admin"
  on public.profiles
  for delete
  to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------
-- Column-level privileges
-- ---------------------------------------------------------------------
-- PostgREST sends only the columns present in the request body, so a
-- restricted UPDATE grant is enough to make `role`, `account_status` and
-- `auth_user_id` un-writable by the owner.
revoke update on public.profiles from anon, authenticated;
grant update (full_name, phone, avatar_url, preferred_language)
  on public.profiles to authenticated;
grant select on public.profiles to authenticated;

-- Only trusted server code (SECURITY DEFINER functions) may insert rows.
revoke insert on public.profiles from anon, authenticated;
revoke delete on public.profiles from anon, authenticated;
