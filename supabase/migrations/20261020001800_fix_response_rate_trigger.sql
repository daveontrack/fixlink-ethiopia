-- =====================================================================
-- FixLink Ethiopia - 019: fix the quotation response rate trigger
-- =====================================================================
-- `refresh_professional_response_rate()` updated
-- `professionals.quotation_response_rate` with `sub.rate`, but the
-- subquery only produces `total` and `responded`:
--
--   ERROR: column sub.rate does not exist
--
-- The trigger `job_matches_refresh_rate` fires on every insert into
-- `job_matches`, so matching a professional with a request failed
-- outright. The rate is the share of notifications that led to a
-- quotation.
-- =====================================================================

create or replace function public.refresh_professional_response_rate()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.professionals p
     set quotation_response_rate = sub.responded / sub.total
    from (
      select
        count(*)::numeric as total,
        count(*) filter (where m.response_status in ('viewed', 'quoted'))::numeric as responded
      from public.job_matches m
      where m.professional_id = new.professional_id
    ) sub
    where p.id = new.professional_id
      and sub.total > 0
      and sub.responded / sub.total <> coalesce(p.quotation_response_rate, -1);

  return new;
end;
$$;

comment on function public.refresh_professional_response_rate() is
  'Keeps professionals.quotation_response_rate in step with their matches.';
