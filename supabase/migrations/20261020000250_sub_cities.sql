-- =====================================================================
-- FixLink Ethiopia — 001b: the sub-cities of Dire Dawa
-- =====================================================================
-- The platform does NOT ask for GPS coordinates. A job request and a
-- professional are located by the SUB-CITY of the Dire Dawa
-- administration, because that is what people actually name when they
-- say where they live, and because it is the unit the administration
-- uses.
--
-- The table holds the name of every sub-city and the approximate CENTRE
-- of it. The centre is used for two things only:
--
--   * the distance the matching measures between two sub-cities, and
--   * the marker the map shows.
--
-- It is never collected from a visitor, and it is never shown to one.
--
-- The nine sub-cities below are seeded here. The seed is idempotent
-- (ON CONFLICT DO UPDATE), so re-running the migration is safe.
-- =====================================================================

create table if not exists public.sub_cities (
  -- Stable machine name, e.g. 'abdi_boru'. This is what the apps send.
  code text primary key
    check (code ~ '^[a-z0-9]+(_[a-z0-9]+)*$'),
  name text not null unique check (char_length(name) between 2 and 80),
  name_am text,
  name_om text,
  -- The approximate centre of the sub-city.
  location extensions.geography(point, 4326) not null,
  sort_order integer not null default 100,
  created_at timestamptz not null default now()
);

create index if not exists sub_cities_location_idx
  on public.sub_cities using gist (location);

insert into public.sub_cities (code, name, name_am, name_om, location, sort_order)
values
  ('abdi_boru', 'Abdi Boru', 'አብዲ ቦሩ', 'Abdi Boruu',
   extensions.st_setsrid(extensions.st_makepoint(41.793, 9.634), 4326)::extensions.geography, 10),
  ('bir_chiro', 'Bir Chiro', 'ብር ችሮ', 'Bir Chiroo',
   extensions.st_setsrid(extensions.st_makepoint(41.812, 9.607), 4326)::extensions.geography, 20),
  ('bole', 'Bole', 'ቦሌ', 'Bolee',
   extensions.st_setsrid(extensions.st_makepoint(41.825, 9.576), 4326)::extensions.geography, 30),
  ('central', 'Central', 'መሃል', 'Mädl',
   extensions.st_setsrid(extensions.st_makepoint(41.866, 9.593), 4326)::extensions.geography, 40),
  ('geda', 'Geda', 'ጌዳ', 'Gedaa',
   extensions.st_setsrid(extensions.st_makepoint(41.885, 9.622), 4326)::extensions.geography, 50),
  ('kele', 'Kele', 'ከሌ', 'Kele',
   extensions.st_setsrid(extensions.st_makepoint(41.876, 9.601), 4326)::extensions.geography, 60),
  ('melikasa', 'Melikasa', 'ሜሊቃሳ', 'Malkasaa',
   extensions.st_setsrid(extensions.st_makepoint(41.833, 9.651), 4326)::extensions.geography, 70),
  ('ras_serkalegn', 'Ras Serkalegn', 'ራስ ሰርካለኝ', 'Ras Sarkaleegn',
   extensions.st_setsrid(extensions.st_makepoint(41.757, 9.575), 4326)::extensions.geography, 80),
  ('yirga_cheta', 'Yirga Cheta', 'ይርጋ ቼታ', 'Yirga Chetaa',
   extensions.st_setsrid(extensions.st_makepoint(41.868, 9.548), 4326)::extensions.geography, 90)
on conflict (code) do update
  set name = excluded.name,
      name_am = excluded.name_am,
      name_om = excluded.name_om,
      location = excluded.location,
      sort_order = excluded.sort_order;

comment on table public.sub_cities is
  'The sub-cities of the Dire Dawa city administration: the service area of the platform.';

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------
alter table public.sub_cities enable row level security;

-- The list of sub-cities is public reference data: it is readable without
-- signing in, so the screens can offer the picker to anybody.
drop policy if exists "sub_cities_select_public" on public.sub_cities;
create policy "sub_cities_select_public"
  on public.sub_cities
  for select
  to anon, authenticated
  using (true);

grant select on public.sub_cities to anon, authenticated;
