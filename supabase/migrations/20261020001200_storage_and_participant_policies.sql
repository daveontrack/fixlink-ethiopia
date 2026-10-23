-- =====================================================================
-- FixLink Ethiopia - 013: storage buckets and participant policies
-- =====================================================================
-- THIS FILE MUST BE APPLIED LAST.
--
-- Why it exists
-- -------------
-- A few Row Level Security policies join tables that are created later
-- in the migration chain:
--
--   job_requests -> job_matches -> quotations -> bookings
--
-- PostgreSQL resolves EVERY relation named in a policy expression when
-- the policy is created (`CREATE POLICY` parses and analyses the
-- expression). A policy that mentions `public.job_matches` therefore
-- fails with
--
--   ERROR: 42P01: relation "public.job_matches" does not exist
--
-- if that table has not been created yet. The same is true for
-- `LANGUAGE sql` function bodies, which are analysed at CREATE time.
--
-- The tables themselves stay in their own migration files (see
-- 20261020000600_job_requests.sql). Only the policies that span more
-- than one table are collected here, together with the storage buckets
-- and the storage policies, which also reference job_requests and
-- job_matches.
--
-- Everything in this file is idempotent: `drop policy if exists` runs
-- first, so re-running the file is safe.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Storage buckets
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('job-photos', 'job-photos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp']),
  ('verification-documents', 'verification-documents', false, 10485760, array['image/jpeg', 'image/png', 'application/pdf'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ---------------------------------------------------------------------
-- Storage policies
-- ---------------------------------------------------------------------
-- Object paths:
--   job-photos              : <profileId>/<jobId>/<uuid>.<ext>
--   verification-documents  : <professionalId>/<docId>.<ext>
--   avatars                 : <profileId>/<uuid>.<ext>

drop policy if exists "job_photos_insert_own_folder" on storage.objects;
create policy "job_photos_insert_own_folder"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'job-photos'
    and (storage.foldername(name))[1] = public.current_profile_id()::text
  );

drop policy if exists "job_photos_read_participants" on storage.objects;
create policy "job_photos_read_participants"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'job-photos'
    and (
      (storage.foldername(name))[1] = public.current_profile_id()::text
      or public.is_admin()
      or exists (
        select 1
        from public.job_requests j
        join public.job_matches m on m.job_id = j.id
        where j.id::text = (storage.foldername(name))[2]
          and m.professional_id = public.current_professional_id()
      )
    )
  );

drop policy if exists "job_photos_delete_own_folder" on storage.objects;
create policy "job_photos_delete_own_folder"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'job-photos'
    and (storage.foldername(name))[1] = public.current_profile_id()::text
  );

drop policy if exists "verification_documents_insert_own" on storage.objects;
create policy "verification_documents_insert_own"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'verification-documents'
    and (storage.foldername(name))[1] = public.current_professional_id()::text
  );

drop policy if exists "verification_documents_read_owner_or_admin" on storage.objects;
create policy "verification_documents_read_owner_or_admin"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'verification-documents'
    and (
      (storage.foldername(name))[1] = public.current_professional_id()::text
      or public.is_admin()
    )
  );

drop policy if exists "verification_documents_delete_own" on storage.objects;
create policy "verification_documents_delete_own"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'verification-documents'
    and (storage.foldername(name))[1] = public.current_professional_id()::text
  );

drop policy if exists "avatars_insert_own_folder" on storage.objects;
create policy "avatars_insert_own_folder"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = public.current_profile_id()::text
  );

drop policy if exists "avatars_read_public" on storage.objects;
create policy "avatars_read_public"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'avatars');

-- ---------------------------------------------------------------------
-- Job requests: who may read a request
-- ---------------------------------------------------------------------
-- A customer sees their own requests. A professional sees a request only
-- once they have been matched to it. Administrators see everything.
drop policy if exists "job_requests_select_participants" on public.job_requests;
create policy "job_requests_select_participants"
  on public.job_requests
  for select
  to authenticated
  using (
    customer_id = public.current_profile_id()
    or public.is_admin()
    or exists (
      select 1 from public.job_matches m
      where m.job_id = job_requests.id
        and m.professional_id = public.current_professional_id()
    )
    or exists (
      select 1 from public.bookings b
      where b.job_id = job_requests.id
        and b.professional_id = public.current_professional_id()
    )
  );

-- ---------------------------------------------------------------------
-- Job photos: only the participants of the request may see them
-- ---------------------------------------------------------------------
drop policy if exists "job_photos_select_participants" on public.job_photos;
create policy "job_photos_select_participants"
  on public.job_photos
  for select
  to authenticated
  using (
    exists (
      select 1 from public.job_requests j
      where j.id = job_photos.job_id
        and (
          j.customer_id = public.current_profile_id()
          or public.is_admin()
          or exists (
            select 1 from public.job_matches m
            where m.job_id = j.id
              and m.professional_id = public.current_professional_id()
          )
          or exists (
            select 1 from public.bookings b
            where b.job_id = j.id
              and b.professional_id = public.current_professional_id()
          )
        )
    )
  );

drop policy if exists "job_photos_insert_owner" on public.job_photos;
create policy "job_photos_insert_owner"
  on public.job_photos
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.job_requests j
      where j.id = job_photos.job_id
        and j.customer_id = public.current_profile_id()
    )
  );

drop policy if exists "job_photos_delete_owner" on public.job_photos;
create policy "job_photos_delete_owner"
  on public.job_photos
  for delete
  to authenticated
  using (
    exists (
      select 1 from public.job_requests j
      where j.id = job_photos.job_id
        and j.customer_id = public.current_profile_id()
    )
  );

-- ---------------------------------------------------------------------
-- Status events: the audit trail is visible to the participants only
-- ---------------------------------------------------------------------
drop policy if exists "job_status_events_select_participants" on public.job_status_events;
create policy "job_status_events_select_participants"
  on public.job_status_events
  for select
  to authenticated
  using (
    exists (
      select 1 from public.job_requests j
      where j.id = job_status_events.job_id
        and (
          j.customer_id = public.current_profile_id()
          or public.is_admin()
          or exists (
            select 1 from public.bookings b
            where b.job_id = j.id
              and b.professional_id = public.current_professional_id()
          )
        )
    )
  );
