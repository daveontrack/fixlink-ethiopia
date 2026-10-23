-- =====================================================================
-- FixLink Ethiopia - 005: audit log and verification documents
-- =====================================================================
-- Verification documents are ID cards, business licences and trade
-- certificates. They are PRIVATE: they live in a private Supabase Storage
-- bucket and are only readable by the owning professional and by
-- administrators. A public professional profile must never expose them.
--
-- Every privileged operation writes an audit_log row. The log is
-- insert-only for application users: nobody may update or delete it.
--
-- The storage buckets and the storage POLICIES live in
-- 20261020001200_storage_and_participant_policies.sql, because they
-- reference job_requests and job_matches, which are created later.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Audit log
-- ---------------------------------------------------------------------
create table if not exists public.audit_log (
  id uuid primary key default extensions.gen_random_uuid(),
  actor_id uuid references public.profiles (id) on delete set null,
  actor_role text not null default 'system',
  action text not null,
  entity_type text not null,
  entity_id uuid,
  -- Non-secret structured context (previous/new status, reasons, ...).
  details jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_log_entity_idx on public.audit_log (entity_type, entity_id);
create index if not exists audit_log_created_at_idx on public.audit_log (created_at desc);
create index if not exists audit_log_actor_idx on public.audit_log (actor_id);

comment on table public.audit_log is
  'Append-only administrative audit trail. Insert-only for admins, never updatable.';

alter table public.audit_log enable row level security;

drop policy if exists "audit_log_select_admin" on public.audit_log;
create policy "audit_log_select_admin"
  on public.audit_log
  for select
  to authenticated
  using (public.is_admin());

drop policy if exists "audit_log_insert_admin" on public.audit_log;
create policy "audit_log_insert_admin"
  on public.audit_log
  for insert
  to authenticated
  with check (public.is_admin() and actor_id = public.current_profile_id());

revoke update, delete on public.audit_log from anon, authenticated;
grant select, insert on public.audit_log to authenticated;

-- ---------------------------------------------------------------------
-- Verification documents
-- ---------------------------------------------------------------------
create table if not exists public.verification_documents (
  id uuid primary key default extensions.gen_random_uuid(),
  professional_id uuid not null references public.professionals (id) on delete cascade,
  document_type public.verification_document_type not null,
  -- Private bucket object path, e.g. verification-documents/<proId>/<docId>.pdf
  storage_path text not null,
  original_file_name text not null,
  review_note text,
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists verification_documents_professional_idx
  on public.verification_documents (professional_id, created_at desc);
create index if not exists verification_documents_pending_idx
  on public.verification_documents (reviewed_at)
  where reviewed_at is null;

alter table public.verification_documents enable row level security;

-- The owner sees their own uploads; administrators see every case.
drop policy if exists "verification_documents_select" on public.verification_documents;
create policy "verification_documents_select"
  on public.verification_documents
  for select
  to authenticated
  using (
    exists (
      select 1 from public.professionals pr
      where pr.id = professional_id
        and (pr.profile_id = public.current_profile_id() or public.is_admin())
    )
  );

drop policy if exists "verification_documents_insert_own" on public.verification_documents;
create policy "verification_documents_insert_own"
  on public.verification_documents
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.professionals pr
      where pr.id = professional_id and pr.profile_id = public.current_profile_id()
    )
  );

-- Deleting an un-reviewed document is allowed for its owner; reviewed
-- documents are immutable so the audit trail stays meaningful.
drop policy if exists "verification_documents_delete_own" on public.verification_documents;
create policy "verification_documents_delete_own"
  on public.verification_documents
  for delete
  to authenticated
  using (
    reviewed_at is null
    and exists (
      select 1 from public.professionals pr
      where pr.id = professional_id and pr.profile_id = public.current_profile_id()
    )
  );

revoke update on public.verification_documents from anon, authenticated;
grant select, insert, delete on public.verification_documents to authenticated;

-- ---------------------------------------------------------------------
-- Administrator decision on a verification case
-- ---------------------------------------------------------------------
create or replace function public.set_verification_status(
  p_professional_id uuid,
  p_decision public.verification_status,
  p_note text default null
)
returns public.professionals
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.current_profile_id();
  v_professional public.professionals;
  v_previous public.verification_status;
begin
  if not public.is_admin() then
    raise exception 'admin_required' using errcode = '42501';
  end if;

  if p_decision not in ('approved', 'rejected') then
    raise exception 'invalid_decision' using errcode = '22023';
  end if;

  select * into v_professional
  from public.professionals
  where id = p_professional_id
  for update;

  if not found then
    raise exception 'professional_not_found' using errcode = 'P0002';
  end if;

  v_previous := v_professional.verification_status;

  update public.professionals
     set verification_status = p_decision
   where id = p_professional_id
   returning * into v_professional;

  update public.verification_documents
     set reviewed_at = now(),
         reviewed_by = v_actor,
         review_note = nullif(btrim(coalesce(p_note, '')), '')
   where professional_id = p_professional_id
     and reviewed_at is null;

  insert into public.audit_log (actor_id, actor_role, action, entity_type, entity_id, details)
  values (
    v_actor,
    'admin',
    'professional.verification_' || p_decision::text,
    'professional',
    p_professional_id,
    jsonb_build_object('previousStatus', v_previous, 'newStatus', p_decision, 'note', p_note)
  );

  return v_professional;
end;
$$;

comment on function public.set_verification_status(uuid, public.verification_status, text) is
  'Administrator-only verification decision. Writes an audit_log row and stamps the pending documents.';

