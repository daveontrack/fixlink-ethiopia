-- =====================================================================
-- FixLink Ethiopia — 022: the matching queue, for the background worker
-- =====================================================================
-- `public.request_matching()` puts a request into `public.matching_queue`,
-- and `public.expand_matching()` is granted to `service_role` only — a
-- browser must never widen the search radius on its own.
--
-- That means a background worker has to drive the queue. It needs three
-- operations, and they have to be safe when two workers run at the same
-- time:
--
--   claim_matching_queue()   take the rows that are due
--   complete_matching_queue() the request was matched
--   fail_matching_queue()    the request could not be matched
--
-- The claim uses `for update skip locked`, so a second worker skips the
-- rows the first one is holding instead of waiting for them.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Claim the rows that are due
-- ---------------------------------------------------------------------
create or replace function public.claim_matching_queue(p_limit int default 20)
returns setof public.matching_queue
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.matching_queue;
begin
  for v_row in
    select q.*
    from public.matching_queue q
    where q.status = 'pending'
      and q.available_at <= now()
    order by q.available_at
    limit greatest(1, least(coalesce(p_limit, 20), 200))
    for update skip locked
  loop
    -- The row is locked by this transaction: mark it as being worked on
    -- so a second worker cannot pick it up.
    update public.matching_queue
       set status = 'processing',
           attempts = attempts + 1
     where id = v_row.id
    returning * into v_row;

    return next v_row;
  end loop;

  return;
end;
$$;

comment on function public.claim_matching_queue(int) is
  'Claims the matching queue rows that are due. Uses FOR UPDATE SKIP LOCKED so two workers never take the same row.';

-- ---------------------------------------------------------------------
-- The request was matched
-- ---------------------------------------------------------------------
create or replace function public.complete_matching_queue(
  p_id uuid,
  p_notified int default 0
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.matching_queue
     set status = 'done',
         processed_at = now(),
         last_error = null
   where id = p_id;
end;
$$;

comment on function public.complete_matching_queue(uuid, int) is
  'Marks a matching queue row as done.';

-- ---------------------------------------------------------------------
-- The request could not be matched
-- ---------------------------------------------------------------------
-- A row that failed is tried again later, up to five times. After that
-- it is marked as failed and an administrator can look at it.
create or replace function public.fail_matching_queue(
  p_id uuid,
  p_error text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempts integer;
begin
  update public.matching_queue
     set status = case when attempts >= 5 then 'failed' else 'pending' end,
         available_at = now() + interval '2 minutes',
         last_error = left(coalesce(p_error, ''), 500)
   where id = p_id
  returning attempts into v_attempts;
end;
$$;

comment on function public.fail_matching_queue(uuid, text) is
  'Records a matching failure. The row is retried up to five times, then it is marked as failed.';

-- ---------------------------------------------------------------------
-- The worker is the only caller
-- ---------------------------------------------------------------------
grant execute on function public.claim_matching_queue(int) to service_role;
grant execute on function public.complete_matching_queue(uuid, int) to service_role;
grant execute on function public.fail_matching_queue(uuid, text) to service_role;

-- The worker also calls these two.
grant execute on function public.match_job(uuid, int, numeric, int) to service_role;
grant execute on function public.expand_matching(uuid) to service_role;
