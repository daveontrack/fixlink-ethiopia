-- =====================================================================
-- FixLink Ethiopia — 026: the verified urban kebeles of Dire Dawa
-- =====================================================================
-- The nine sub-cities seeded by 20261020000250_sub_cities.sql predate any
-- source check. None of them could be matched to an authoritative list of
-- the Dire Dawa city administration, so they are kept (job_requests and
-- professionals still reference their codes) but flagged inactive: they no
-- longer appear in the location pickers.
--
-- The records added below are the nine URBAN woredas/kebeles of the
-- "Dire Dawa urban" zone of the OCHA Common Operational Dataset for
-- Ethiopia (COD-AB), published through https://openadmindata.org/et/.
-- The extraction, the checks and the limitations are documented in
-- supabase/README.md ("Verified service areas").
--
-- Retrieved: 2026-10-23. Confidence: high for the names and the p-codes
-- (OCHA COD-AB is the reference dataset used by the humanitarian
-- community); the coordinates are the woreda centroids supplied by the
-- same dataset, not surveyed kebele centres.
--
-- NOTHING IS DELETED OR RENAMED HERE. Every existing code stays valid for
-- the foreign keys of job_requests and professionals.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Provenance and visibility columns
-- ---------------------------------------------------------------------
alter table public.sub_cities
  add column if not exists is_active boolean not null default true,
  add column if not exists source text,
  add column if not exists source_code text;

comment on column public.sub_cities.is_active is
  'Whether the sub-city appears in the location pickers. Inactive rows stay readable so stored requests keep their location.';
comment on column public.sub_cities.source is
  'Dataset the row was verified against, with its retrieval date. NULL for rows that were never verified.';
comment on column public.sub_cities.source_code is
  'Official administrative code in the source dataset (OCHA COD-AB p-code). NULL when the source provides none.';

-- ---------------------------------------------------------------------
-- 2. Retire the unverified rows from the pickers (not from the database)
-- ---------------------------------------------------------------------
-- The codes are listed explicitly on purpose: a later import must never
-- deactivate a verified location by accident.
update public.sub_cities
   set is_active = false
 where source_code is null
   and code in (
     'abdi_boru',
     'bir_chiro',
     'bole',
     'central',
     'geda',
     'kele',
     'melikasa',
     'ras_serkalegn',
     'yirga_cheta'
   );

-- ---------------------------------------------------------------------
-- 3. The verified urban kebeles
-- ---------------------------------------------------------------------
-- name_am / name_om are left NULL: neither source provides authoritative
-- Amharic or Oromo spellings, and a translation is not invented here.
-- The coordinates are (longitude, latitude) as supplied by the source.
insert into public.sub_cities (
  code, name, name_am, name_om, location, sort_order, is_active,
  source, source_code
)
values
  ('sabian', 'Sabian', null, null,
   extensions.st_setsrid(extensions.st_makepoint(41.835, 9.627), 4326)::extensions.geography,
   10, true, 'OCHA COD-AB ET via openadmindata.org (retrieved 2026-10-23)', 'ET150103'),
  ('malka_jabti', 'Malka Jabti /M.Jebdu', null, null,
   extensions.st_setsrid(extensions.st_makepoint(41.795, 9.629), 4326)::extensions.geography,
   20, true, 'OCHA COD-AB ET via openadmindata.org (retrieved 2026-10-23)', 'ET150104'),
  ('legehare', 'Legehare', null, null,
   extensions.st_setsrid(extensions.st_makepoint(41.877, 9.605), 4326)::extensions.geography,
   30, true, 'OCHA COD-AB ET via openadmindata.org (retrieved 2026-10-23)', 'ET150105'),
  ('addis_ketema_dd', 'Addis Ketema (DD)', null, null,
   extensions.st_setsrid(extensions.st_makepoint(41.860, 9.589), 4326)::extensions.geography,
   40, true, 'OCHA COD-AB ET via openadmindata.org (retrieved 2026-10-23)', 'ET150109'),
  ('gende_kore', 'Gende Kore', null, null,
   extensions.st_setsrid(extensions.st_makepoint(41.855, 9.600), 4326)::extensions.geography,
   50, true, 'OCHA COD-AB ET via openadmindata.org (retrieved 2026-10-23)', 'ET150110'),
  ('dechatu', 'Dechatu', null, null,
   extensions.st_setsrid(extensions.st_makepoint(41.883, 9.601), 4326)::extensions.geography,
   60, true, 'OCHA COD-AB ET via openadmindata.org (retrieved 2026-10-23)', 'ET150111'),
  ('hafat_issa', 'Hafat Issa', null, null,
   extensions.st_setsrid(extensions.st_makepoint(41.869, 9.605), 4326)::extensions.geography,
   70, true, 'OCHA COD-AB ET via openadmindata.org (retrieved 2026-10-23)', 'ET150112'),
  ('kazira', 'Kazira', null, null,
   extensions.st_setsrid(extensions.st_makepoint(41.855, 9.636), 4326)::extensions.geography,
   80, true, 'OCHA COD-AB ET via openadmindata.org (retrieved 2026-10-23)', 'ET150113'),
  ('police_maret', 'Police Maret', null, null,
   extensions.st_setsrid(extensions.st_makepoint(41.868, 9.639), 4326)::extensions.geography,
   90, true, 'OCHA COD-AB ET via openadmindata.org (retrieved 2026-10-23)', 'ET150114')
on conflict do nothing;

comment on table public.sub_cities is
  'The service areas of the platform: the nine verified urban kebeles of the Dire Dawa city administration, plus legacy rows kept for existing references.';
