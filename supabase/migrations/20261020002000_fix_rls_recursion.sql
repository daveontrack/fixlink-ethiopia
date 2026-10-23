-- =====================================================================
-- FixLink Ethiopia — 021: break the Row Level Security recursion
-- =====================================================================
-- THE BUG
-- -------
-- Two policies referenced each other, and PostgreSQL refuses to evaluate
-- them:
--
--   job_requests_select_participants   (on job_requests)
--     -> exists (select 1 from public.job_matches ...)
--
--   job_matches_select_participants   (on job_matches)
--     -> exists (select 1 from public.job_requests ...)
--
-- Reading a job request made PostgreSQL evaluate the policy on
-- `job_matches`, which made it evaluate the policy on `job_requests`
-- again. PostgreSQL detects the cycle and aborts the whole query:
--
--   ERROR: infinite recursion detected in policy for relation "job_requests"
--
-- It broke every screen that lists requests, including the administrator
-- review screen, because the policy expression is evaluated for every row
-- regardless of the caller.
--
-- THE FIX
-- -------
-- The cross-table lookups move into SECURITY DEFINER helper functions.
-- A SECURITY DEFINER function owned by the table owner reads the table
-- WITHOUT its Row Level Security policies, so the policy on `job_matches`
-- is never evaluated from inside the policy on `job_requests` — and the
-- cycle disappears.
--
-- The helpers are safe to expose, because they take no identity from
-- their arguments: they always answer the question "may THIS caller see
-- this job?", and the caller is resolved from the JWT.
-- =====================================================================

-- ---------------------------------------------------------------------
-- The helpers
-- ---------------------------------------------------------------------
-- May the caller see this job because they own it?
create or replace function public.is_job_owner(p_job_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.job_requests j
    where j.id = p_job_id
      and j.customer_id = public.current_profile_id()
  );
$$;

comment on function public.is_job_owner(uuid) is
  'True when the caller is the customer who created the job.';

-- May the caller see this job because they were notified about it?
create or replace function public.is_matched_to_job(p_job_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.job_matches m
    where m.job_id = p_job_id
      and m.professional_id = public.current_professional_id()
  );
$$;

comment on function public.is_matched_to_job(uuid) is
  'True when the calling professional was matched to the job.';

-- May the caller see this job because they have a booking for it?
create or replace function public.has_professional_booking(p_job_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.bookings b
    where b.job_id = p_job_id
      and b.professional_id = public.current_professional_id()
  );
$$;

comment on function public.has_professional_booking(uuid) is
  'True when the calling professional has a booking for the job.';

-- The complete rule: who may see a job request.
create or replace function public.can_view_job(p_job_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_admin()
    or public.is_job_owner(p_job_id)
    or public.is_matched_to_job(p_job_id)
    or public.has_professional_booking(p_job_id);
$$;

comment on function public.can_view_job(uuid) is
  'True when the caller may read the job: the owner, an administrator, a matched professional, or a professional with a booking.';

-- The same rule, for a job id that arrives as text (the storage paths
-- carry the job id as a folder name, and a folder name is not
-- guaranteed to be a uuid — casting it could raise an error instead of
-- simply saying "not visible").
create or replace function public.is_job_visible_to_matched_professional(
  p_job_id_text text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.job_requests j
    join public.job_matches m on m.job_id = j.id
    where j.id::text = p_job_id_text
      and m.professional_id = public.current_professional_id()
  );
$$;

comment on function public.is_job_visible_to_matched_professional(text) is
  'True when the calling professional was matched to the job whose id is given as text.';

-- ---------------------------------------------------------------------
-- The policies, rewritten with the helpers
-- ---------------------------------------------------------------------
drop policy if exists "job_requests_select_participants" on public.job_requests;
create policy "job_requests_select_participants"
  on public.job_requests
  for select
  to authenticated
  using (public.can_view_job(job_requests.id));

drop policy if exists "job_matches_select_participants" on public.job_matches;
create policy "job_matches_select_participants"
  on public.job_matches
  for select
  to authenticated
  using (
    professional_id = public.current_professional_id()
    or public.is_admin()
    or public.is_job_owner(job_matches.job_id)
  );

drop policy if exists "job_photos_select_participants" on public.job_photos;
create policy "job_photos_select_participants"
  on public.job_photos
  for select
  to authenticated
  using (public.can_view_job(job_photos.job_id));

drop policy if exists "job_photos_insert_owner" on public.job_photos;
create policy "job_photos_insert_owner"
  on public.job_photos
  for insert
  to authenticated
  with check (public.is_job_owner(job_photos.job_id));

drop policy if exists "job_photos_delete_owner" on public.job_photos;
create policy "job_photos_delete_owner"
  on public.job_photos
  for delete
  to authenticated
  using (public.is_job_owner(job_photos.job_id));

drop policy if exists "job_status_events_select_participants" on public.job_status_events;
create policy "job_status_events_select_participants"
  on public.job_status_events
  for select
  to authenticated
  using (public.can_view_job(job_status_events.job_id));

drop policy if exists "quotations_select_participants" on public.quotations;
create policy "quotations_select_participants"
  on public.quotations
  for select
  to authenticated
  using (
    professional_id = public.current_professional_id()
    or public.is_admin()
    or public.is_job_owner(quotations.job_id)
  );

-- ---------------------------------------------------------------------
-- The helpers are safe to call from a policy, so they need EXECUTE.
-- They are granted to the application roles like every other helper.
-- ---------------------------------------------------------------------
grant execute on function public.is_job_owner(uuid) to authenticated;
grant execute on function public.is_matched_to_job(uuid) to authenticated;
grant execute on function public.has_professional_booking(uuid) to authenticated;
grant execute on function public.can_view_job(uuid) to authenticated;
grant execute on function public.is_job_visible_to_matched_professional(text) to authenticated;

-- ---------------------------------------------------------------------
-- The storage policy for the job photos
-- ---------------------------------------------------------------------
-- It joined `job_requests` and `job_matches` directly, which made
-- PostgreSQL evaluate the policies of both tables for every object. The
-- helper answers the same question without touching the policies.
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
      or public.is_job_visible_to_matched_professional(
        (storage.foldername(name))[2]
      )
    )
  );
