-- =====================================================================
-- FixLink Ethiopia - 017: public professional locations
-- =====================================================================
-- The map and the public profile cards need the sub-city of a
-- professional and the categories they offer, but `professionals.base_location`
-- is a `geography` point, which PostgREST cannot return in a usable form.
--
-- This view projects it into plain columns:
--
--   sub_city_code / base_area_name   the sub-city the professional is in
--   categories                       the offered categories as JSON
--
-- Only APPROVED professionals appear: this is the public directory, so it
-- is readable without an account (`anon`). Everything else stays behind
-- the Row Level Security of the underlying tables.
-- =====================================================================

drop view if exists public.professional_locations;
create view public.professional_locations as
select
  pr.id as professional_id,
  pr.profile_id,
  p.full_name,
  p.avatar_url,
  pr.sub_city_code,
  pr.base_area_name,
  pr.verification_status,
  pr.accepts_requests,
  pr.service_radius_km,
  pr.years_of_experience,
  pr.average_rating,
  pr.total_reviews,
  pr.completed_jobs,
  (
    select json_agg(
      json_build_object(
        'id', ps.category_id,
        'slug', sc.slug,
        'name', sc.name,
        'name_am', sc.name_am,
        'name_om', sc.name_om
      )
      order by sc.sort_order
    )
    from public.professional_services ps
    join public.service_categories sc on sc.id = ps.category_id
    where ps.professional_id = pr.id
  ) as categories
from public.professionals pr
join public.profiles p on p.id = pr.profile_id
where pr.verification_status = 'approved';

comment on view public.professional_locations is
  'Public directory of approved professionals: sub-city, categories and rating.';

revoke all on public.professional_locations from anon;
grant select on public.professional_locations to anon, authenticated;
