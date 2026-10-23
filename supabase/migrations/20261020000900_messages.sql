-- =====================================================================
-- FixLink Ethiopia - 010: private booking conversations
-- =====================================================================
-- Messages belong to a BOOKING, never to a job. Only the two people in
-- that booking (customer + booked professional) and administrators may
-- read or send them. There is no channel that exposes conversation
-- content to other users, and the Realtime subscription is filtered by
-- the same RLS policy as a normal read.
-- =====================================================================

create table if not exists public.messages (
  id uuid primary key default extensions.gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 5000),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists messages_booking_idx
  on public.messages (booking_id, created_at);
create index if not exists messages_unread_idx
  on public.messages (booking_id)
  where read_at is null;

-- ---------------------------------------------------------------------
-- Send a message
-- ---------------------------------------------------------------------
create or replace function public.send_message(
  p_booking_id uuid,
  p_body text
)
returns public.messages
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.current_profile_id();
  v_message public.messages;
  v_customer uuid;
  v_professional uuid;
begin
  if v_actor is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  if char_length(btrim(coalesce(p_body, ''))) < 1
     or char_length(btrim(p_body)) > 5000 then
    raise exception 'invalid_message_body' using errcode = '22023';
  end if;

  select b.customer_id, b.professional_id
    into v_customer, v_professional
  from public.bookings b
  where b.id = p_booking_id;

  if not found then
    raise exception 'booking_not_found' using errcode = 'P0002';
  end if;

  if v_actor <> v_customer and v_actor <> v_professional then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  insert into public.messages (booking_id, sender_id, body)
  values (p_booking_id, v_actor, btrim(p_body))
  returning * into v_message;

  -- Notify the other participant.
  perform public.notify(
    case when v_actor = v_customer then v_professional else v_customer end,
    'message.received',
    'New message',
    left(btrim(p_body), 120),
    jsonb_build_object('bookingId', p_booking_id, 'messageId', v_message.id),
    format('message:%s', v_message.id)
  );

  return v_message;
end;
$$;

comment on function public.send_message(uuid, text) is
  'Send a message inside a booking conversation. Only booking participants may send.';

-- ---------------------------------------------------------------------
-- Mark the other participant''s messages as read
-- ---------------------------------------------------------------------
create or replace function public.mark_messages_read(
  p_booking_id uuid
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.current_profile_id();
  v_count integer;
begin
  if v_actor is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  update public.messages
     set read_at = now()
   where booking_id = p_booking_id
     and read_at is null
     and sender_id <> v_actor
     and (
       v_actor = (select customer_id from public.bookings where id = p_booking_id)
       or v_actor = (select professional_id from public.professionals where id = p_booking_id)
     );

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------
alter table public.messages enable row level security;

drop policy if exists "messages_select_participants" on public.messages;
create policy "messages_select_participants"
  on public.messages
  for select
  to authenticated
  using (
    sender_id = public.current_profile_id()
    or exists (
      select 1 from public.bookings b
      where b.id = messages.booking_id
        and (
          b.customer_id = public.current_profile_id()
          or b.professional_id = public.current_professional_id()
        )
    )
    or public.is_admin()
  );

-- Sending goes through public.send_message() only.
revoke insert, update, delete on public.messages from anon, authenticated;
grant select on public.messages to authenticated;
