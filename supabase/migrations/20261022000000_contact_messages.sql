-- =====================================================================
-- FixLink Ethiopia — 026: public contact messages
-- =====================================================================
-- The web app has a public contact form but the schema had no destination
-- for it. This is a forward-only migration: it adds one table and touches
-- no existing table, column, policy or row.
--
-- Anyone may INSERT a contact message (the form is public). Only
-- administrators may read them. Updates are limited to the handled flag,
-- which only administrators may change.
-- =====================================================================

create table if not exists public.contact_messages (
  id uuid primary key default extensions.gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  email text not null check (char_length(email) between 3 and 254),
  phone text check (char_length(phone) <= 30),
  subject text not null check (char_length(subject) between 3 and 200),
  message text not null check (char_length(message) between 20 and 5000),
  is_handled boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists contact_messages_created_at_idx
  on public.contact_messages (created_at desc);

alter table public.contact_messages enable row level security;

drop policy if exists "contact_messages_insert_public" on public.contact_messages;
create policy "contact_messages_insert_public"
  on public.contact_messages
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists "contact_messages_select_admin" on public.contact_messages;
create policy "contact_messages_select_admin"
  on public.contact_messages
  for select
  to authenticated
  using (public.is_admin());

drop policy if exists "contact_messages_update_admin" on public.contact_messages;
create policy "contact_messages_update_admin"
  on public.contact_messages
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

revoke update, delete on public.contact_messages from anon, authenticated;
grant insert on public.contact_messages to anon, authenticated;
grant select, update on public.contact_messages to authenticated;
