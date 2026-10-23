-- =====================================================================
-- FixLink Ethiopia - 003: service categories
-- =====================================================================
-- Categories are data, not code: administrators add them at runtime, so a
-- new city or trade can be introduced without redeploying the apps.
-- The four launch categories are seeded below; the seed is idempotent
-- (ON CONFLICT DO NOTHING) so re-running the migration is safe.
-- =====================================================================

create table if not exists public.service_categories (
  id uuid primary key default extensions.gen_random_uuid(),
  slug text not null unique
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (char_length(name) between 2 and 80),
  description text,
  name_am text,
  name_om text,
  icon_key text,
  is_active boolean not null default true,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists service_categories_active_idx
  on public.service_categories (is_active, sort_order);

drop trigger if exists service_categories_set_updated_at on public.service_categories;
create trigger service_categories_set_updated_at
  before update on public.service_categories
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Seed the launch categories
-- ---------------------------------------------------------------------
insert into public.service_categories (slug, name, description, name_am, name_om, icon_key, sort_order)
values
  ('plumbing', 'Plumbing', 'Leaking pipes, blocked drains, taps and toilet repairs.',
   'የቧንባሪንግ አገልግሎት', 'Tuubaa qaamaa bishaanii', 'pipe', 10),
  ('electrical-repair', 'Electrical repair', 'Sockets, lights, breakers and wiring problems.',
   'የኤሌክትሪክ ጥገና', 'Cilmi elektirikii haaromsa', 'bolt', 20),
  ('appliance-repair', 'Appliance repair', 'Stoves, fridges, washing machines and small appliances.',
   'የመባል መሣሪያ ጥገና', 'Qabeeyyee meeshaa haaromsa', 'wrench', 30),
  ('computer-it-support', 'Computer & IT support', 'Laptop repairs, network setup and software help.',
   'የኮምፒዩተር እና አይቲ ድጋፍ', 'Komputerii fi IT fayyaada', 'laptop', 40)
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------
alter table public.service_categories enable row level security;

-- The public service catalogue is readable without signing in.
drop policy if exists "service_categories_select_public" on public.service_categories;
create policy "service_categories_select_public"
  on public.service_categories
  for select
  to anon, authenticated
  using (is_active or public.is_admin());

-- Only administrators may create, change or deactivate categories.
drop policy if exists "service_categories_admin_all" on public.service_categories;
create policy "service_categories_admin_all"
  on public.service_categories
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant select on public.service_categories to anon, authenticated;
grant insert, update, delete on public.service_categories to authenticated;
