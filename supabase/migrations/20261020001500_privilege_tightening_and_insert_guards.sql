-- =====================================================================
-- FixLink Ethiopia - 016: privilege tightening and insert guards
-- =====================================================================
-- Follow-up to 20261020001300_lock_down_privileges.sql.
--
-- Two problems are left:
--
--   1. `anon` still holds INSERT/UPDATE/DELETE on several tables.
--      Row Level Security stops the rows, but the privilege itself is
--      wrong and must not be there.
--
--   2. `professionals` could be self-inserted by any signed-in user
--      with `verification_status = 'approved'`, because the guard
--      trigger only fired on UPDATE. The row would then look like an
--      approved professional to the matching algorithm and to the
--      public profile cards. The guard now covers INSERT as well.
--
-- The views were created AFTER the previous migration, so they also
-- need the write privileges taken away.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. `anon` is a read-only role
-- ---------------------------------------------------------------------
do $$
declare
  r record;
begin
  for r in
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'v', 'p')
  loop
    execute format(
      'revoke insert, update, delete, truncate on table public.%I from anon',
      r.relname
    );
  end loop;
end
$$;

-- ---------------------------------------------------------------------
-- 2. The audit trail is written by SECURITY DEFINER functions only
-- ---------------------------------------------------------------------
revoke insert, update, delete, truncate on public.audit_log from anon, authenticated;

-- ---------------------------------------------------------------------
-- 3. Administrators may edit the single matching_config row, never
--    create or destroy one
-- ---------------------------------------------------------------------
revoke insert, delete, truncate on public.matching_config from anon, authenticated;

-- ---------------------------------------------------------------------
-- 4. The conversation views are read models
-- ---------------------------------------------------------------------
revoke insert, update, delete, truncate
  on public.view_participant_conversations from anon, authenticated;
revoke insert, update, delete, truncate
  on public.view_unread_message_counts from anon, authenticated;
grant select on public.view_participant_conversations to authenticated;
grant select on public.view_unread_message_counts to authenticated;

-- ---------------------------------------------------------------------
-- 5. A professional row is created by public.start_as_professional()
--    only, so nobody can hand themselves an approved profile
-- ---------------------------------------------------------------------
revoke insert on public.professionals from anon, authenticated;

-- The guard now covers INSERT as well as UPDATE. On INSERT the
-- verification status and the rating counters are forced back to their
-- defaults, whatever the client sent.
create or replace function public.protect_professional_insert()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  -- Inside a SECURITY DEFINER function (start_as_professional) the
  -- statement runs as the table owner: trusted, nothing to force.
  if current_user in ('postgres', 'supabase_admin') then
    return new;
  end if;

  new.verification_status := 'pending';
  new.average_rating := null;
  new.total_reviews := 0;
  new.completed_jobs := 0;
  new.quotation_response_rate := null;
  return new;
end;
$$;

drop trigger if exists professionals_protect_insert on public.professionals;
create trigger professionals_protect_insert
  before insert on public.professionals
  for each row execute function public.protect_professional_insert();

-- ---------------------------------------------------------------------
-- 6. A verification document is uploaded unreviewed
-- ---------------------------------------------------------------------
-- A professional must not be able to mark their own document as
-- reviewed; only an administrator (public.set_verification_status)
-- may stamp it.
create or replace function public.protect_verification_document_insert()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user in ('postgres', 'supabase_admin') or public.is_admin() then
    return new;
  end if;

  new.reviewed_at := null;
  new.reviewed_by := null;
  new.review_note := null;
  return new;
end;
$$;

drop trigger if exists verification_documents_protect_insert
  on public.verification_documents;
create trigger verification_documents_protect_insert
  before insert on public.verification_documents
  for each row execute function public.protect_verification_document_insert();
