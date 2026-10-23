-- =====================================================================
-- FixLink Ethiopia — 025: the Clerk identity
--
-- CLERK is the only authentication system of the platform. The account
-- lives in Clerk (`user_2abc...`), the session lives in the cookie the
-- Clerk SDK manages, and the Clerk session token is sent to PostgREST as
-- `Authorization: Bearer <token>` (the JWT bridge).
--
-- PostgREST exposes the decoded claims through `request.jwt.claims`, so
-- the database resolves the caller from the `sub` claim — which is the
-- CLERK user id. That id is a TEXT (`user_...`), not a uuid: the previous
-- migration (002) was written for Supabase Auth, where the `sub` claim was
-- the uuid of `auth.users`. This migration corrects that:
--
--   * `profiles.clerk_user_id` (text) becomes the canonical external
--     identity, exactly as `supabase/README.md` documents it;
--   * the identity helpers read the `sub` claim as text;
--   * `ensure_profile()` also accepts the e-mail address, because a Clerk
--     session token does not carry one by default (the address is added by
--     a Clerk JWT template or sent by the client);
--   * two service-role-only functions are added for the Clerk webhook, so
--     the platform can synchronise an account without a signed-in user.
--
-- NOTHING IS DROPPED HERE: no table, no column and no earlier migration
-- disappears. The old `profiles.auth_user_id` column stays (it is simply
-- not the identity any more), and the rows that already have one keep it.
--
-- The Row Level Security design is NOT changed: the policies keep asking
-- `current_profile_id()`, `is_admin()` and `is_active_account()`, and those
-- functions keep resolving the caller from the token. Only the shape of
-- the identity changed.
--
-- A profile that has no `clerk_user_id` yet (a legacy row, or a demo row
-- created by `scripts/seed-demo.mjs`) is ADOPTED by the first Clerk sign-in
-- with the same e-mail address — so signing up never creates a second
-- profile for the same person.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. The Clerk user id column
-- ---------------------------------------------------------------------
alter table public.profiles
  add column if not exists clerk_user_id text;

comment on column public.profiles.clerk_user_id is
  'The Clerk user id (user_...). The single source of identity. NULL until the account signs in for the first time.';

-- The e-mail address of the account is a COPY: it is written by
-- `ensure_profile()` and by the webhook of Clerk, and it is the only
-- address the platform can mail. The column is created here as well, so
-- this migration also applies to a database whose `profiles` table was
-- created without it.
alter table public.profiles
  add column if not exists email text;

comment on column public.profiles.email is
  'A copy of the e-mail address of the Clerk account. Synced by ensure_profile() and by the webhook of Clerk.';

-- The rows that already have an identity keep it: the uuid of the old
-- Supabase Auth account becomes the (text) external id.
--
-- The block is guarded: a database that never had the old column (a
-- project that started with Clerk) simply has nothing to convert.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'auth_user_id'
  ) then
    update public.profiles
       set clerk_user_id = auth_user_id::text
     where clerk_user_id is null
       and auth_user_id is not null;
  end if;
end;
$$;

create unique index if not exists profiles_clerk_user_id_key
  on public.profiles (clerk_user_id);

create index if not exists profiles_clerk_user_id_idx
  on public.profiles (clerk_user_id);

create index if not exists profiles_email_idx
  on public.profiles (lower(email));

-- ---------------------------------------------------------------------
-- 2. The identity helpers
-- ---------------------------------------------------------------------
-- The Clerk user id of the caller, or NULL when nobody is signed in.
--
-- The `sub` claim is read from `request.jwt.claim.sub` (set by PostgREST)
-- with a fallback to the full `request.jwt.claims` document. The value is
-- TEXT: a Clerk user id is `user_...`, and it must never be cast to a
-- uuid.
create or replace function public.current_clerk_user_id()
returns text
language sql
stable
as $$
  select nullif(
    coalesce(
      nullif(current_setting('request.jwt.claim.sub', true), ''),
      (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
    ),
    ''
  );
$$;

comment on function public.current_clerk_user_id() is
  'Clerk user id of the caller (request.jwt.claims.sub). NULL when signed out.';

-- The e-mail address of the caller, taken from the JWT `email` claim.
-- Only present when the Clerk instance adds it to the session token.
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
  where p.clerk_user_id = public.current_clerk_user_id()
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
  where p.clerk_user_id = public.current_clerk_user_id()
  limit 1;
$$;

comment on function public.current_user_role() is
  'profiles.role of the signed-in user, or NULL when signed out.';

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
    where p.clerk_user_id = public.current_clerk_user_id()
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
    where p.clerk_user_id = public.current_clerk_user_id()
      and p.account_status = 'active'
  );
$$;

comment on function public.is_active_account() is
  'True when the caller owns an active account.';

-- The old helper is gone: the identity is the Clerk user id now.
drop function if exists public.current_auth_user_id();

-- ---------------------------------------------------------------------
-- 3. ensure_profile(): create or refresh the profile of the caller
-- ---------------------------------------------------------------------
-- SECURITY DEFINER: the client may not insert into `profiles` directly
-- (that would allow choosing `role`, `account_status`, or another
-- user's `clerk_user_id`). This function fixes all of those server-side.
--
-- It is IDEMPOTENT: calling it twice never creates a second profile.
--
-- `p_email` is optional: a Clerk session token does not carry the address
-- by default, so the client (which knows it) or the Clerk webhook passes
-- it explicitly.
drop function if exists public.ensure_profile(text, text, text);

create or replace function public.ensure_profile(
  p_full_name text default null,
  p_phone text default null,
  p_avatar_url text default null,
  p_email text default null
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_clerk_user_id text := public.current_clerk_user_id();
  v_email text := coalesce(
    nullif(btrim(coalesce(p_email, '')), ''),
    nullif(btrim(coalesce(public.current_auth_email(), '')), '')
  );
  v_profile public.profiles;
  v_name text := nullif(btrim(coalesce(p_full_name, '')), '');
begin
  if v_clerk_user_id is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  select * into v_profile
  from public.profiles
  where clerk_user_id = v_clerk_user_id;

  if not found and v_email is not null then
    -- A profile without a Clerk identity (a legacy row, or a demo row)
    -- and the same e-mail address: this is the same person, so the row
    -- is adopted instead of duplicated. A row that already belongs to
    -- another Clerk account is never touched.
    select * into v_profile
    from public.profiles
    where clerk_user_id is null
      and lower(email) = lower(v_email)
    order by created_at
    limit 1;

    if found then
      update public.profiles
         set clerk_user_id = v_clerk_user_id
       where id = v_profile.id
      returning * into v_profile;
    end if;
  end if;

  if not found then
    insert into public.profiles (clerk_user_id, email, full_name, phone, avatar_url)
    values (
      v_clerk_user_id,
      v_email,
      coalesce(v_name, 'FixLink user'),
      p_phone,
      p_avatar_url
    )
    on conflict (clerk_user_id) do update
      set email = coalesce(excluded.email, public.profiles.email)
      returning * into v_profile;

    if v_profile.id is null then
      select * into v_profile
      from public.profiles
      where clerk_user_id = v_clerk_user_id;
    end if;
  else
    -- Only the editable fields are touched. role / account_status /
    -- clerk_user_id are deliberately NOT part of this update.
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

comment on function public.ensure_profile(text, text, text, text) is
  'Create or refresh the profile of the signed-in Clerk user. Idempotent. Never changes role or account_status.';

-- The grant of the previous signature is gone with the function: give it
-- to the authenticated role again, and to nobody else.
revoke all on function public.ensure_profile(text, text, text, text) from public, anon;
grant execute on function public.ensure_profile(text, text, text, text) to authenticated;

-- ---------------------------------------------------------------------
-- 4. The protected columns
-- ---------------------------------------------------------------------
-- The trigger function is deliberately NOT `security definer`: it must see
-- the role the statement really runs as, which is `service_role`,
-- `postgres` or `supabase_admin` for the trusted write paths, and
-- `authenticated` / `anon` for a direct write from the API.
create or replace function public.protect_profile_columns()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.role is distinct from old.role
     or new.account_status is distinct from old.account_status
     or new.clerk_user_id is distinct from old.clerk_user_id
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
-- 5. Supabase Auth is no longer the identity system
-- ---------------------------------------------------------------------
-- The trigger on `auth.users` created the profile of a Supabase Auth
-- sign-up. There are no Supabase Auth sign-ups any more: the account is
-- created in Clerk, and the profile is created by `ensure_profile()` (the
-- first authenticated request) or by the Clerk webhook.
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

-- The old column is KEPT (no table and no column of the database is
-- dropped by this migration): it is simply not the identity any more.
-- `profiles.clerk_user_id` is. The column stays for the rows that were
-- created before the switch, and it is never written any more.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'auth_user_id'
  ) then
    execute 'comment on column public.profiles.auth_user_id is
      ''Obsolete: the identity of a profile is profiles.clerk_user_id. Kept for the rows created before the switch to Clerk; never written any more.''';
  end if;
end;
$$;

-- The column-level privileges are re-applied, so the new column is not
-- writable by the owner of the profile.
revoke update on public.profiles from anon, authenticated;
grant update (full_name, phone, avatar_url, preferred_language)
  on public.profiles to authenticated;

-- ---------------------------------------------------------------------
-- 6. The Clerk webhook
-- ---------------------------------------------------------------------
-- The webhook of Clerk tells the platform that an account was created,
-- changed or deleted. It is signed by Clerk (Svix), the route verifies
-- the signature, and the write happens with the service-role key.
--
-- These two functions are the ONLY way to write a profile without a
-- signed-in user, so they are restricted to the service role.
create or replace function public.upsert_profile_from_clerk(
  p_clerk_user_id text,
  p_email text default null,
  p_full_name text default null,
  p_avatar_url text default null
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles;
  v_name text := nullif(btrim(coalesce(p_full_name, '')), '');
  v_email text := nullif(btrim(coalesce(p_email, '')), '');
begin
  if p_clerk_user_id is null or btrim(p_clerk_user_id) = '' then
    raise exception 'missing_clerk_user_id' using errcode = '22023';
  end if;

  select * into v_profile
  from public.profiles
  where clerk_user_id = p_clerk_user_id;

  if found then
    update public.profiles
       set email = coalesce(v_email, email),
           full_name = coalesce(v_name, full_name),
           avatar_url = coalesce(p_avatar_url, avatar_url)
     where id = v_profile.id
    returning * into v_profile;
  else
    insert into public.profiles (clerk_user_id, email, full_name, avatar_url)
    values (
      p_clerk_user_id,
      v_email,
      coalesce(v_name, 'FixLink user'),
      p_avatar_url
    )
    on conflict (clerk_user_id) do update
      set email = coalesce(excluded.email, public.profiles.email),
          full_name = coalesce(excluded.full_name, public.profiles.full_name),
          avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url)
    returning * into v_profile;
  end if;

  return v_profile;
end;
$$;

comment on function public.upsert_profile_from_clerk(text, text, text, text) is
  'Create or refresh the profile of a Clerk account (the webhook of Clerk). Service role only.';

revoke all on function public.upsert_profile_from_clerk(text, text, text, text) from public, anon, authenticated;
grant execute on function public.upsert_profile_from_clerk(text, text, text, text) to service_role;

-- An account that was deleted in Clerk: the profile is closed, never
-- deleted, so the marketplace history (requests, bookings, messages)
-- survives.
create or replace function public.close_profile_of_clerk_user(
  p_clerk_user_id text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles;
begin
  if p_clerk_user_id is null or btrim(p_clerk_user_id) = '' then
    return false;
  end if;

  update public.profiles
     set account_status = 'closed'
   where clerk_user_id = p_clerk_user_id
  returning * into v_profile;

  return found;
end;
$$;

comment on function public.close_profile_of_clerk_user(text) is
  'Close the profile of a deleted Clerk account (the webhook of Clerk). Service role only.';

revoke all on function public.close_profile_of_clerk_user(text) from public, anon, authenticated;
grant execute on function public.close_profile_of_clerk_user(text) to service_role;

-- ---------------------------------------------------------------------
-- 7. The helper of the first draft of this migration
-- ---------------------------------------------------------------------
-- The identity helper was first called `clerk_user_id()`. Its name is
-- `current_clerk_user_id()` now (it matches `current_profile_id()` and
-- the other helpers), and the old name is dropped: the helpers above
-- already read the `sub` claim, so nothing depends on it any more.
drop function if exists public.clerk_user_id();
