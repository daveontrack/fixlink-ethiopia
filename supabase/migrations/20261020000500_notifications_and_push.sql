-- =====================================================================
-- FixLink Ethiopia - 006: notifications, device tokens, push outbox
-- =====================================================================
-- APPLY ORDER: this file must be applied BEFORE the matching and
-- quotation migrations, because they call public.notify().
--
-- Two delivery channels:
--
--  1. In-app notifications (table `notifications`). These are the source
--     of truth. The web app polls / subscribes to them; the mobile app
--     shows them in a list and as a badge.
--
--  2. Mobile push (table `push_outbox`). A row is enqueued for every
--     notification that targets a device, and a Supabase Edge Function
--     drains the outbox and calls Expo's push service.
--
-- Deduplication: `notifications.dedupe_key` is unique per user, so a
-- retried event (webhook replay, edge function retry) never delivers
-- twice. `public.notify()` is the ONLY supported way to create a
-- notification.
-- =====================================================================

create table if not exists public.notifications (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null,
  title text not null,
  body text not null default '',
  -- Deep-link payload. Never contains secrets.
  data jsonb,
  read_at timestamptz,
  dedupe_key text,
  created_at timestamptz not null default now()
);

create unique index if not exists notifications_dedupe_idx
  on public.notifications (user_id, dedupe_key)
  where dedupe_key is not null;
create index if not exists notifications_user_recent_idx
  on public.notifications (user_id, created_at desc);
create index if not exists notifications_unread_idx
  on public.notifications (user_id)
  where read_at is null;

comment on column public.notifications.dedupe_key is
  'Stable key per (user, event). A unique index makes notification delivery idempotent.';

-- ---------------------------------------------------------------------
-- Device tokens for Expo push
-- ---------------------------------------------------------------------
create table if not exists public.device_tokens (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  token text not null unique,
  platform public.device_platform not null,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists device_tokens_user_idx on public.device_tokens (user_id);

-- ---------------------------------------------------------------------
-- Push outbox (durable background job)
-- ---------------------------------------------------------------------
-- Rows are claimed with `for update skip locked` by the edge function, so
-- two concurrent invocations never send the same push twice.
create table if not exists public.push_outbox (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  notification_id uuid references public.notifications (id) on delete cascade,
  title text not null,
  body text not null default '',
  data jsonb,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  attempts integer not null default 0,
  last_error text,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists push_outbox_pending_idx
  on public.push_outbox (created_at)
  where status = 'pending';

-- ---------------------------------------------------------------------
-- The single entry point for creating a notification
-- ---------------------------------------------------------------------
create or replace function public.notify(
  p_user_id uuid,
  p_type text,
  p_title text,
  p_body text default '',
  p_data jsonb default null,
  p_dedupe_key text default null
)
returns public.notifications
language plpgsql
security definer
set search_path = public
as $$
declare
  v_notification public.notifications;
  v_token record;
begin
  if p_user_id is null then
    raise exception 'notification_user_required' using errcode = '22023';
  end if;

  insert into public.notifications (user_id, type, title, body, data, dedupe_key)
  values (p_user_id, p_type, p_title, coalesce(p_body, ''), p_data, p_dedupe_key)
  on conflict (user_id, dedupe_key) where dedupe_key is not null
  do nothing
  returning * into v_notification;

  -- `found` is false when the conflict clause skipped the insert, which
  -- means the notification was already delivered earlier (retry).
  if not found then
    select * into v_notification
    from public.notifications
    where user_id = p_user_id and dedupe_key = p_dedupe_key;
    return v_notification;
  end if;

  -- Enqueue one push per registered device.
  for v_token in
    select dt.id, dt.token
    from public.device_tokens dt
    where dt.user_id = p_user_id
  loop
    insert into public.push_outbox (user_id, notification_id, title, body, data)
    values (p_user_id, v_notification.id, p_notification.title, p_notification.body, p_notification.data);
  end loop;

  return v_notification;
end;
$$;

comment on function public.notify(uuid, text, text, text, jsonb, text) is
  'Create an in-app notification and enqueue device pushes. Idempotent when dedupe_key is supplied.';

-- ---------------------------------------------------------------------
-- Mark notifications as read (owner only)
-- ---------------------------------------------------------------------
create or replace function public.mark_notifications_read(
  p_ids uuid[] default null
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

  if p_ids is null or array_length(p_ids, 1) is null then
    update public.notifications
       set read_at = now()
     where user_id = v_actor and read_at is null;
  else
    update public.notifications
       set read_at = now()
     where user_id = v_actor and read_at is null and id = any (p_ids);
  end if;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- ---------------------------------------------------------------------
-- Register / refresh a device push token
-- ---------------------------------------------------------------------
create or replace function public.register_device_token(
  p_token text,
  p_platform public.device_platform
)
returns public.device_tokens
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.current_profile_id();
  v_row public.device_tokens;
begin
  if v_actor is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  if length(btrim(coalesce(p_token, ''))) < 8 then
    raise exception 'invalid_device_token' using errcode = '22023';
  end if;

  insert into public.device_tokens (user_id, token, platform, last_seen_at)
  values (v_actor, btrim(p_token), p_platform, now())
  on conflict (token) do update
    set user_id = excluded.user_id,
        platform = excluded.platform,
        last_seen_at = now()
  returning * into v_row;

  return v_row;
end;
$$;

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------
alter table public.notifications enable row level security;

drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own"
  on public.notifications
  for select
  to authenticated
  using (user_id = public.current_profile_id());

-- Writes happen only through public.notify() / public.mark_notifications_read().
revoke insert, update, delete on public.notifications from anon, authenticated;
grant select on public.notifications to authenticated;

alter table public.device_tokens enable row level security;

drop policy if exists "device_tokens_select_own" on public.device_tokens;
create policy "device_tokens_select_own"
  on public.device_tokens
  for select
  to authenticated
  using (user_id = public.current_profile_id());

revoke insert, update, delete on public.device_tokens from anon, authenticated;
grant select on public.device_tokens to authenticated;

alter table public.push_outbox enable row level security;

-- The outbox is written by public.notify() only; the edge function uses
-- the service role, which bypasses RLS.
revoke all on public.push_outbox from anon, authenticated;
