-- =====================================================================
-- FixLink Ethiopia - 015: message conversation views
-- =====================================================================
-- The dashboard needs two read models that do not exist as tables:
--
--   view_participant_conversations - one row per booking the caller
--     takes part in, with the last message and the other party.
--
--   view_unread_message_counts - one row per booking with the number of
--     messages the caller has not read yet.
--
-- Both views are owned by the database and filter on
-- public.current_profile_id() / public.current_professional_id(), so a
-- caller only ever sees their own conversations, even though the view
-- itself bypasses the Row Level Security of the underlying tables.
--
-- These views read `messages`, so they must be created after
-- 20261020000900_messages.sql.
-- =====================================================================

drop view if exists public.view_participant_conversations;
create view public.view_participant_conversations as
select
  b.id                     as booking_id,
  b.customer_id,
  b.professional_id,
  b.status                 as booking_status,
  b.scheduled_at,
  coalesce(p.full_name, 'Professional') as professional_name,
  coalesce(cp.full_name, '')            as customer_name,
  sc.name                  as service_category,
  jr.title                 as job_title,
  jr.area_name             as area_name,
  lm.body                  as last_message_body,
  lm.created_at            as last_message_at
from public.bookings b
join public.job_requests jr
  on jr.id = b.job_id
left join public.service_categories sc
  on sc.id = jr.category_id
left join public.professionals pr
  on pr.id = b.professional_id
left join public.profiles p
  on p.id = pr.profile_id
left join public.profiles cp
  on cp.id = b.customer_id
left join lateral (
  select m.body, m.created_at
  from public.messages m
  where m.booking_id = b.id
  order by m.created_at desc
  limit 1
) lm on true
where b.customer_id = public.current_profile_id()
   or b.professional_id = public.current_professional_id()
   or public.is_admin();

comment on view public.view_participant_conversations is
  'Bookings the caller takes part in, with the most recent message.';

drop view if exists public.view_unread_message_counts;
create view public.view_unread_message_counts as
select
  b.id as booking_id,
  count(m.id)::int as unread_count
from public.bookings b
left join public.messages m
  on m.booking_id = b.id
 and m.read_at is null
 and m.sender_id is distinct from public.current_profile_id()
where b.customer_id = public.current_profile_id()
   or b.professional_id = public.current_professional_id()
   or public.is_admin()
group by b.id;

comment on view public.view_unread_message_counts is
  'Unread message count per booking, for the caller only.';

revoke all on public.view_participant_conversations from anon;
revoke all on public.view_unread_message_counts from anon;
grant select on public.view_participant_conversations to authenticated;
grant select on public.view_unread_message_counts to authenticated;
