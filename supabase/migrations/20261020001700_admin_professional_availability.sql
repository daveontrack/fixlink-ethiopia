-- =====================================================================
-- FixLink Ethiopia - 018: administrator control of professional availability
-- =====================================================================
-- `public.update_professional_profile()` always writes the CALLER's own
-- professional row, which is the right behaviour for a professional editing
-- their own profile — but it means an administrator cannot pause a
-- professional from the admin dashboard.
--
-- This function is the administrator's counterpart: it writes another
-- professional's availability toggle and nothing else. It is SECURITY
-- DEFINER so it can write the protected column, and it refuses anyone who
-- is not an active administrator.
-- =====================================================================

create or replace function public.set_professional_availability(
  p_professional_id uuid,
  p_accepts_requests boolean
)
returns public.professionals
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.current_profile_id();
  v_professional public.professionals;
begin
  if not public.is_admin() then
    raise exception 'admin_required' using errcode = '42501';
  end if;

  select * into v_professional
  from public.professionals
  where id = p_professional_id
  for update;

  if not found then
    raise exception 'professional_not_found' using errcode = 'P0002';
  end if;

  update public.professionals
     set accepts_requests = coalesce(p_accepts_requests, accepts_requests)
   where id = p_professional_id
   returning * into v_professional;

  insert into public.audit_log (
    actor_id, actor_role, action, entity_type, entity_id, details
  )
  values (
    v_actor,
    'admin',
    'professional.availability_' || (case when p_accepts_requests then 'enabled' else 'paused' end),
    'professional',
    p_professional_id,
    jsonb_build_object('accepts_requests', p_accepts_requests)
  );

  return v_professional;
end;
$$;

comment on function public.set_professional_availability(uuid, boolean) is
  'Administrator only: pause or resume a professional from the admin dashboard.';

revoke all on function public.set_professional_availability(uuid, boolean) from anon;
grant execute on function public.set_professional_availability(uuid, boolean) to authenticated;
