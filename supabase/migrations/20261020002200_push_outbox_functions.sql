-- =====================================================================
-- FixLink Ethiopia — 023: the push outbox, for the push dispatcher
-- =====================================================================
-- `public.notify()` writes an in-app notification AND enqueues a row in
-- `public.push_outbox`. The in-app notification is the source of truth;
-- the push is only a nudge, so a failure to deliver it must never lose
-- anything.
--
-- The dispatcher (supabase/functions/push-dispatcher) needs the same
-- three operations as the matching worker, with the same
-- `for update skip locked` guarantee, so two dispatchers never send the
-- same push twice.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Claim the rows that are due
-- ---------------------------------------------------------------------
create or replace function public.claim_push_outbox(p_limit int default 20)
returns setof public.push_outbox
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.push_outbox;
begin
  for v_row in
    select o.*
    from public.push_outbox o
    where o.status = 'pending'
    order by o.created_at
    limit greatest(1, least(coalesce(p_limit, 20), 200))
    for update skip locked
  loop
    update public.push_outbox
       set status = 'pending',
           attempts = attempts + 1
     where id = v_row.id
    returning * into v_row;

    return next v_row;
  end loop;

  return;
end;
$$;

comment on function public.claim_push_outbox(int) is
  'Claims the pending push outbox rows. Uses FOR UPDATE SKIP LOCKED so two dispatchers never send the same push.';

-- ---------------------------------------------------------------------
-- The push was delivered
-- ---------------------------------------------------------------------
create or replace function public.complete_push_outbox(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.push_outbox
     set status = 'sent',
         sent_at = now(),
         last_error = null
   where id = p_id;
end;
$$;

comment on function public.complete_push_outbox(uuid) is
  'Marks a push outbox row as sent.';

-- ---------------------------------------------------------------------
-- The push could not be delivered
-- ---------------------------------------------------------------------
-- The in-app notification is still there, so the row is simply marked as
-- failed after five attempts. It is never retried forever.
create or replace function public.fail_push_outbox(
  p_id uuid,
  p_error text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.push_outbox
     set status = case when attempts >= 5 then 'failed' else 'pending' end,
         last_error = left(coalesce(p_error, ''), 500)
   where id = p_id;
end;
$$;

comment on function public.fail_push_outbox(uuid, text) is
  'Records a push failure. The row is retried up to five times, then it is marked as failed.';

-- ---------------------------------------------------------------------
-- The tokens of a user, for the dispatcher
-- ---------------------------------------------------------------------
create or replace function public.device_tokens_of(p_user_id uuid)
returns table (token text, platform public.device_platform)
language sql
stable
security definer
set search_path = public
as $$
  select d.token, d.platform
  from public.device_tokens d
  where d.user_id = p_user_id;
$$;

comment on function public.device_tokens_of(uuid) is
  'The push tokens of a user. Only the dispatcher may call it.';

-- ---------------------------------------------------------------------
-- The dispatcher is the only caller
-- ---------------------------------------------------------------------
grant execute on function public.claim_push_outbox(int) to service_role;
grant execute on function public.complete_push_outbox(uuid) to service_role;
grant execute on function public.fail_push_outbox(uuid, text) to service_role;
grant execute on function public.device_tokens_of(uuid) to service_role;
