-- =====================================================================
-- FixLink Ethiopia — Clerk identity migration
-- =====================================================================
-- Switches the identity model from Supabase Auth (UUID sub) to Clerk
-- (string sub, e.g. "user_2abc..."). Apply ONLY after configuring Clerk
-- as a third-party auth provider in the Supabase dashboard
-- (Authentication -> Providers -> Clerk), so Supabase validates Clerk JWTs
-- and exposes the Clerk user id via auth.uid() / request.jwt.claims.sub.
--
-- WARNING: This migration is destructive-ish (column type change). Back up
-- the database before applying. Test on a staging project first.
-- =====================================================================

-- 1. profiles.auth_user_id: uuid -> text (Clerk user id is a string).
--    Drop the FK to auth.users first (Clerk users are not Supabase rows).
alter table public.profiles
  drop constraint if exists profiles_auth_user_id_fkey;

alter table public.profiles
  alter column auth_user_id type text using auth_user_id::text;

-- 2. current_auth_user_id(): return text instead of uuid.
create or replace function public.current_auth_user_id()
returns text
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

  return v_raw;
end;
$$;

-- 3. ensure_profile(): already uses current_auth_user_id() (now text) and
--    compares to profiles.auth_user_id (now text). No signature change
--    needed, but re-create to be safe.
-- (The existing function body is compatible; only the column type changed.)

-- 4. is_admin / current_profile_id / current_user_role: compare text to text.
--    They already use current_auth_user_id(), so they remain correct.

-- 5. handle_new_user trigger: with Clerk as the provider, Supabase may not
--    insert auth.users rows. Disable the trigger to avoid failures; profile
--    creation is handled by ensure_profile() called from the app.
drop trigger if exists on_auth_user_created on auth.users;

-- 6. Backfill: if any existing profiles have a UUID auth_user_id that no
--    longer matches, leave them as-is (they remain linked to old Supabase
--    users). New sign-ins via Clerk create new profiles via ensure_profile.

comment on column public.profiles.auth_user_id is
  'The Clerk user id (e.g. "user_2abc..."). The single source of identity when Clerk is the auth provider.';
EOF
echo "written"