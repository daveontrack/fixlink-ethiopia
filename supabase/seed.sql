-- =====================================================================
-- FixLink Ethiopia — demo data for the pilot
--
-- This file fills the database with a realistic marketplace so the apps
-- can be used, demonstrated and evaluated without typing rows by hand.
-- It is idempotent: running it again updates the same rows.
--
-- The profiles are created by `scripts/seed-demo.mjs`, which also creates
-- the matching Supabase Auth accounts (a profile needs a real identity).
-- Everything below finds them by their demo name.
--
-- The money is Ethiopian Birr (ETB).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Professionals
-- ---------------------------------------------------------------------
insert into public.professionals (
  id, profile_id, bio, years_of_experience, verification_status,
  accepts_requests, service_radius_km, base_area_name, base_location,
  average_rating, total_reviews, completed_jobs, quotation_response_rate
)
select
  '11111111-1111-4111-8111-111111111111'::uuid,
  p.id,
  'Plumber and fitter with 8 years of experience in Dire Dawa. Pipes, water heaters and bathroom renovation.',
  8, 'approved', true, 25, 'Dire Dawa',
  extensions.st_setsrid(extensions.st_makepoint(41.8501, 9.6009), 4326)::extensions.geography,
  4.8, 12, 45, 0.92
from public.profiles p where p.full_name = 'Ahmed Demo'
on conflict (id) do update set
  bio = excluded.bio,
  years_of_experience = excluded.years_of_experience,
  verification_status = excluded.verification_status,
  accepts_requests = excluded.accepts_requests,
  service_radius_km = excluded.service_radius_km,
  base_area_name = excluded.base_area_name,
  average_rating = excluded.average_rating,
  total_reviews = excluded.total_reviews,
  completed_jobs = excluded.completed_jobs,
  quotation_response_rate = excluded.quotation_response_rate;

insert into public.professionals (
  id, profile_id, bio, years_of_experience, verification_status,
  accepts_requests, service_radius_km, base_area_name, base_location,
  average_rating, total_reviews, completed_jobs, quotation_response_rate
)
select
  '22222222-2222-4222-8222-222222222222'::uuid,
  p.id,
  'Electrician: sockets, lighting, breakers and generator repair. Certified for industrial work.',
  12, 'approved', true, 30, 'Gambela',
  extensions.st_setsrid(extensions.st_makepoint(41.8402, 9.5936), 4326)::extensions.geography,
  4.6, 8, 30, 0.78
from public.profiles p where p.full_name = 'Samuel Demo'
on conflict (id) do update set
  bio = excluded.bio,
  verification_status = excluded.verification_status,
  average_rating = excluded.average_rating,
  total_reviews = excluded.total_reviews,
  completed_jobs = excluded.completed_jobs;

insert into public.professionals (
  id, profile_id, bio, years_of_experience, verification_status,
  accepts_requests, service_radius_km, base_area_name, base_location,
  average_rating, total_reviews, completed_jobs, quotation_response_rate
)
select
  '33333333-3333-4333-8333-333333333333'::uuid,
  p.id,
  'Appliance repair: stoves, fridges, washing machines and small appliances. Same-day service.',
  5, 'approved', true, 20, 'Dire Dawa',
  extensions.st_setsrid(extensions.st_makepoint(41.8560, 9.6050), 4326)::extensions.geography,
  4.4, 5, 18, 0.88
from public.profiles p where p.full_name = 'Maria Demo'
on conflict (id) do update set
  bio = excluded.bio,
  verification_status = excluded.verification_status,
  average_rating = excluded.average_rating,
  total_reviews = excluded.total_reviews,
  completed_jobs = excluded.completed_jobs;

insert into public.professionals (
  id, profile_id, bio, years_of_experience, verification_status,
  accepts_requests, service_radius_km, base_area_name, base_location
)
select
  '44444444-4444-4444-8444-444444444444'::uuid,
  p.id,
  'Computer and IT support: network setup, software help and data recovery.',
  3, 'pending', true, 15, 'Dire Dawa',
  extensions.st_setsrid(extensions.st_makepoint(41.8520, 9.5980), 4326)::extensions.geography
from public.profiles p where p.full_name = 'Gutu Demo'
on conflict (id) do update set
  bio = excluded.bio,
  verification_status = excluded.verification_status,
  accepts_requests = excluded.accepts_requests;

-- ---------------------------------------------------------------------
-- 2. Services and coverage areas
-- ---------------------------------------------------------------------
insert into public.professional_services (professional_id, category_id, starting_price_etb)
select pr.id, sc.id, 750
from public.professionals pr, public.service_categories sc
where pr.id = '11111111-1111-4111-8111-111111111111'::uuid and sc.slug = 'plumbing'
on conflict do nothing;

insert into public.professional_services (professional_id, category_id, starting_price_etb)
select pr.id, sc.id, 890
from public.professionals pr, public.service_categories sc
where pr.id = '22222222-2222-4222-8222-222222222222'::uuid and sc.slug = 'electrical-repair'
on conflict do nothing;

insert into public.professional_services (professional_id, category_id, starting_price_etb)
select pr.id, sc.id, 1100
from public.professionals pr, public.service_categories sc
where pr.id = '22222222-2222-4222-8222-222222222222'::uuid and sc.slug = 'computer-it-support'
on conflict do nothing;

insert into public.professional_services (professional_id, category_id, starting_price_etb)
select pr.id, sc.id, 500
from public.professionals pr, public.service_categories sc
where pr.id = '33333333-3333-4333-8333-333333333333'::uuid and sc.slug = 'appliance-repair'
on conflict do nothing;

insert into public.professional_services (professional_id, category_id, starting_price_etb)
select pr.id, sc.id, 600
from public.professionals pr, public.service_categories sc
where pr.id = '33333333-3333-4333-8333-333333333333'::uuid and sc.slug = 'plumbing'
on conflict do nothing;

insert into public.professional_services (professional_id, category_id, starting_price_etb)
select pr.id, sc.id, 1200
from public.professionals pr, public.service_categories sc
where pr.id = '44444444-4444-4444-8444-444444444444'::uuid and sc.slug = 'computer-it-support'
on conflict do nothing;

insert into public.service_areas (professional_id, area_name)
select '11111111-1111-4111-8111-111111111111'::uuid, 'Dire Dawa'
on conflict do nothing;

insert into public.service_areas (professional_id, area_name)
select '11111111-1111-4111-8111-111111111111'::uuid, 'Gambela'
on conflict do nothing;

insert into public.service_areas (professional_id, area_name)
select '22222222-2222-4222-8222-222222222222'::uuid, 'Dire Dawa'
on conflict do nothing;

insert into public.service_areas (professional_id, area_name)
select '33333333-3333-4333-8333-333333333333'::uuid, 'Dire Dawa'
on conflict do nothing;

insert into public.service_areas (professional_id, area_name)
select '44444444-4444-4444-8444-444444444444'::uuid, 'Jijiga'
on conflict do nothing;

-- ---------------------------------------------------------------------
-- 3. Verification documents (private bucket)
-- ---------------------------------------------------------------------
insert into public.verification_documents (
  id, professional_id, document_type, storage_path, original_file_name
)
values
  (
    'a1111111-1111-4111-8111-111111111111'::uuid,
    '44444444-4444-4444-8444-444444444444'::uuid,
    'id_card',
    '44444444-4444-4444-8444-444444444444/a1111111-1111-4111-8111-111111111111.png',
    'national-id.png'
  ),
  (
    'a2222222-2222-4222-8222-222222222222'::uuid,
    '44444444-4444-4444-8444-444444444444'::uuid,
    'trade_certificate',
    '44444444-4444-4444-8444-444444444444/a2222222-2222-4222-8222-222222222222.png',
    'trade-certificate.png'
  )
on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- 4. Job requests (the demo customer)
-- ---------------------------------------------------------------------
insert into public.job_requests (
  id, customer_id, category_id, title, description, priority, status,
  area_name, location, location_source, match_score, expires_at, created_at
)
select
  'c0000001-0000-4000-8000-000000000001'::uuid,
  p.id,
  sc.id,
  'Leaking pipe under the kitchen sink',
  'Water comes out of the joint under the sink whenever the tap runs. It started two days ago and the cabinet is damp.',
  'urgent', 'booked', 'Dire Dawa',
  extensions.st_setsrid(extensions.st_makepoint(41.8501, 9.6009), 4326)::extensions.geography,
  'manual', 0.91, now() + interval '3 days', now() - interval '6 days'
from public.profiles p, public.service_categories sc
where p.full_name = 'Jane Demo' and sc.slug = 'plumbing'
on conflict (id) do nothing;

insert into public.job_requests (
  id, customer_id, category_id, title, description, priority, status,
  area_name, location, location_source, match_score, expires_at, created_at
)
select
  'c0000002-0000-4000-8000-000000000002'::uuid,
  p.id,
  sc.id,
  'Living room sockets spark when switched on',
  'Two sockets in the living room spark and smell burnt. The breaker trips when they are used.',
  'normal', 'quoted', 'Gambela',
  extensions.st_setsrid(extensions.st_makepoint(41.8402, 9.5936), 4326)::extensions.geography,
  'manual', 0.84, now() + interval '5 days', now() - interval '2 days'
from public.profiles p, public.service_categories sc
where p.full_name = 'Jane Demo' and sc.slug = 'electrical-repair'
on conflict (id) do nothing;

insert into public.job_requests (
  id, customer_id, category_id, title, description, priority, status,
  area_name, location, location_source, match_score, expires_at, created_at
)
select
  'c0000003-0000-4000-8000-000000000003'::uuid,
  p.id,
  sc.id,
  'Front loader washing machine does not spin',
  'The washing machine fills and drains but never spins. It is four years old and the drum is noisy.',
  'normal', 'matching', 'Dire Dawa',
  extensions.st_setsrid(extensions.st_makepoint(41.8560, 9.6050), 4326)::extensions.geography,
  'manual', 0.77, now() + interval '6 days', now() - interval '1 day'
from public.profiles p, public.service_categories sc
where p.full_name = 'Jane Demo' and sc.slug = 'appliance-repair'
on conflict (id) do nothing;

insert into public.job_requests (
  id, customer_id, category_id, title, description, priority, status,
  area_name, location, location_source, created_at
)
select
  'c0000004-0000-4000-8000-000000000004'::uuid,
  p.id,
  sc.id,
  'Laptop will not connect to the office Wi-Fi',
  'The laptop sees the network but the connection drops after a minute. It started after the router was replaced.',
  'normal', 'open', 'Jijiga',
  extensions.st_setsrid(extensions.st_makepoint(41.8600, 9.5990), 4326)::extensions.geography,
  'manual', now() - interval '3 hours'
from public.profiles p, public.service_categories sc
where p.full_name = 'Jane Demo' and sc.slug = 'computer-it-support'
on conflict (id) do nothing;

insert into public.job_requests (
  id, customer_id, category_id, title, description, priority, status,
  area_name, location, location_source, created_at
)
select
  'c0000005-0000-4000-8000-000000000005'::uuid,
  p.id,
  sc.id,
  'Bedroom socket has no power',
  'The socket in the bedroom stopped working. The others are fine.',
  'normal', 'completed', 'Dire Dawa',
  extensions.st_setsrid(extensions.st_makepoint(41.8501, 9.6009), 4326)::extensions.geography,
  'manual', now() - interval '20 days'
from public.profiles p, public.service_categories sc
where p.full_name = 'Jane Demo' and sc.slug = 'electrical-repair'
on conflict (id) do nothing;

insert into public.job_requests (
  id, customer_id, category_id, title, description, priority, status,
  area_name, location, location_source, created_at
)
select
  'c0000006-0000-4000-8000-000000000006'::uuid,
  p.id,
  sc.id,
  'Replace the kitchen tap mixer',
  'The mixer drips and the handle is loose.',
  'normal', 'cancelled', 'Dire Dawa',
  extensions.st_setsrid(extensions.st_makepoint(41.8501, 9.6009), 4326)::extensions.geography,
  'manual', now() - interval '12 days'
from public.profiles p, public.service_categories sc
where p.full_name = 'Jane Demo' and sc.slug = 'plumbing'
on conflict (id) do nothing;

insert into public.job_requests (
  id, customer_id, category_id, title, description, priority, status,
  area_name, location, location_source, created_at
)
select
  'c0000007-0000-4000-8000-000000000007'::uuid,
  p.id,
  sc.id,
  'Kitchen sink drains very slowly',
  'The sink takes almost a minute to empty and the trap smells.',
  'normal', 'completed', 'Dire Dawa',
  extensions.st_setsrid(extensions.st_makepoint(41.8501, 9.6009), 4326)::extensions.geography,
  'manual', now() - interval '30 days'
from public.profiles p, public.service_categories sc
where p.full_name = 'Jane Demo' and sc.slug = 'plumbing'
on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- 5. The status history of the requests
-- ---------------------------------------------------------------------
insert into public.job_status_events (
  id, job_id, actor_id, actor_role, from_status, to_status, note, created_at
)
select
  'd0000001-0000-4000-8000-000000000001'::uuid,
  'c0000001-0000-4000-8000-000000000001'::uuid,
  p.id, 'customer', 'open', 'open', 'Request created', now() - interval '6 days'
from public.profiles p where p.full_name = 'Jane Demo'
on conflict (id) do nothing;

insert into public.job_status_events (
  id, job_id, actor_id, actor_role, from_status, to_status, note, created_at
)
select
  'd0000001-0000-4000-8000-000000000002'::uuid,
  'c0000001-0000-4000-8000-000000000001'::uuid,
  p.id, 'system', 'open', 'matching', '2 professionals were notified', now() - interval '6 days' + interval '2 hours'
from public.profiles p where p.full_name = 'Jane Demo'
on conflict (id) do nothing;

insert into public.job_status_events (
  id, job_id, actor_id, actor_role, from_status, to_status, note, created_at
)
select
  'd0000001-0000-4000-8000-000000000003'::uuid,
  'c0000001-0000-4000-8000-000000000001'::uuid,
  p.id, 'customer', 'matching', 'quoted', 'First quotation received', now() - interval '5 days'
from public.profiles p where p.full_name = 'Jane Demo'
on conflict (id) do nothing;

insert into public.job_status_events (
  id, job_id, booking_id, actor_id, actor_role, from_status, to_status, note, created_at
)
select
  'd0000001-0000-4000-8000-000000000004'::uuid,
  'c0000001-0000-4000-8000-000000000001'::uuid,
  'b0000001-0000-4000-8000-000000000001'::uuid,
  p.id, 'customer', 'quoted', 'booked', 'Quotation accepted', now() - interval '4 days'
from public.profiles p where p.full_name = 'Jane Demo'
on conflict (id) do nothing;

insert into public.job_status_events (
  id, job_id, actor_id, actor_role, from_status, to_status, note, created_at
)
select
  'd0000002-0000-4000-8000-000000000001'::uuid,
  'c0000002-0000-4000-8000-000000000002'::uuid,
  p.id, 'customer', 'open', 'open', 'Request created', now() - interval '2 days'
from public.profiles p where p.full_name = 'Jane Demo'
on conflict (id) do nothing;

insert into public.job_status_events (
  id, job_id, actor_id, actor_role, from_status, to_status, note, created_at
)
select
  'd0000002-0000-4000-8000-000000000003'::uuid,
  'c0000002-0000-4000-8000-000000000002'::uuid,
  p.id, 'system', 'open', 'matching', '1 professional was notified', now() - interval '2 days' + interval '1 hour'
from public.profiles p where p.full_name = 'Jane Demo'
on conflict (id) do nothing;

insert into public.job_status_events (
  id, job_id, actor_id, actor_role, from_status, to_status, note, created_at
)
select
  'd0000003-0000-4000-8000-000000000003'::uuid,
  'c0000003-0000-4000-8000-000000000003'::uuid,
  p.id, 'customer', 'open', 'open', 'Request created', now() - interval '1 day'
from public.profiles p where p.full_name = 'Jane Demo'
on conflict (id) do nothing;

insert into public.job_status_events (
  id, job_id, booking_id, actor_id, actor_role, from_status, to_status, note, created_at
)
select
  'd0000005-0000-4000-8000-000000000005'::uuid,
  'c0000005-0000-4000-8000-000000000005'::uuid,
  'b0000005-0000-4000-8000-000000000005'::uuid,
  p.id, 'customer', 'quoted', 'booked', 'Quotation accepted', now() - interval '19 days'
from public.profiles p where p.full_name = 'Jane Demo'
on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- 6. The professionals that were matched to the requests
-- ---------------------------------------------------------------------
insert into public.job_matches (
  id, job_id, professional_id, batch_number, rank, score, score_components,
  distance_km, notified_at, response_status, created_at
)
values
  (
    'e0000001-0000-4000-8000-000000000001'::uuid,
    'c0000001-0000-4000-8000-000000000001'::uuid,
    '11111111-1111-4111-8111-111111111111'::uuid,
    1, 1, 0.91, '{"D":0.95,"R":0.8,"Q":0.9,"A":1,"H":0.53}'::jsonb,
    1.2, now() - interval '6 days', 'quoted', now() - interval '6 days'
  ),
  (
    'e0000001-0000-4000-8000-000000000002'::uuid,
    'c0000001-0000-4000-8000-000000000001'::uuid,
    '33333333-3333-4333-8333-333333333333'::uuid,
    1, 2, 0.72, '{"D":0.9,"R":0.88,"Q":0.5,"A":1,"H":0.33}'::jsonb,
    3.4, now() - interval '6 days', 'declined', now() - interval '6 days'
  ),
  (
    'e0000002-0000-4000-8000-000000000002'::uuid,
    'c0000002-0000-4000-8000-000000000002'::uuid,
    '22222222-2222-4222-8222-222222222222'::uuid,
    1, 1, 0.84, '{"D":0.9,"R":0.92,"Q":0.78,"A":1,"H":0.8}'::jsonb,
    1.1, now() - interval '2 days', 'quoted', now() - interval '2 days'
  ),
  (
    'e0000003-0000-4000-8000-000000000003'::uuid,
    'c0000003-0000-4000-8000-000000000003'::uuid,
    '33333333-3333-4333-8333-333333333333'::uuid,
    1, 1, 0.77, '{"D":0.9,"R":0.88,"Q":0.88,"A":1,"H":0.33}'::jsonb,
    2.0, now() - interval '1 day', 'pending', now() - interval '1 day'
  ),
  (
    'e0000004-0000-4000-8000-000000000004'::uuid,
    'c0000004-0000-4000-8000-000000000004'::uuid,
    '44444444-4444-4444-8444-444444444444'::uuid,
    1, 1, 0.69, '{"D":0.9,"R":0.6,"Q":0.65,"A":1,"H":0.2}'::jsonb,
    1.6, now() - interval '3 hours', 'pending', now() - interval '3 hours'
  ),
  (
    'e0000005-0000-4000-8000-000000000005'::uuid,
    'c0000005-0000-4000-8000-000000000005'::uuid,
    '22222222-2222-4222-8222-222222222222'::uuid,
    1, 1, 0.88, '{"D":0.95,"R":0.92,"Q":0.78,"A":1,"H":0.8}'::jsonb,
    1.1, now() - interval '20 days', 'quoted', now() - interval '20 days'
  )
on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- 7. Quotations
-- ---------------------------------------------------------------------
insert into public.quotations (
  id, job_id, professional_id, labor_cost_etb, materials_cost_etb, notes,
  proposed_start_at, valid_until, status, created_at
)
values
  (
    'f0000001-0000-4000-8000-000000000001'::uuid,
    'c0000001-0000-4000-8000-000000000001'::uuid,
    '11111111-1111-4111-8111-111111111111'::uuid,
    900, 150,
    'Replace the leaking joint and reseal the trap. Includes the joint and the sealant.',
    now() + interval '1 day', now() + interval '7 days', 'selected', now() - interval '5 days'
  ),
  (
    'f0000001-0000-4000-8000-000000000002'::uuid,
    'c0000001-0000-4000-8000-000000000001'::uuid,
    '33333333-3333-4333-8333-333333333333'::uuid,
    700, 300,
    'Replace the whole trap and the flexible connectors, then test the drainage.',
    now() + interval '2 days', now() + interval '7 days', 'declined', now() - interval '5 days'
  ),
  (
    'f0000002-0000-4000-8000-000000000002'::uuid,
    'c0000002-0000-4000-8000-000000000002'::uuid,
    '22222222-2222-4222-8222-222222222222'::uuid,
    1200, 400,
    'Replace the two burnt sockets, test the circuit and check the earthing.',
    now() + interval '1 day', now() + interval '6 days', 'submitted', now() - interval '1 day'
  ),
  (
    'f0000003-0000-4000-8000-000000000003'::uuid,
    'c0000003-0000-4000-8000-000000000003'::uuid,
    '33333333-3333-4333-8333-333333333333'::uuid,
    650, 200,
    'Diagnose the motor and the belt. A new belt and a capacitor if needed.',
    now() + interval '2 days', now() + interval '7 days', 'submitted', now() - interval '10 hours'
  ),
  (
    'f0000005-0000-4000-8000-000000000005'::uuid,
    'c0000005-0000-4000-8000-000000000005'::uuid,
    '22222222-2222-4222-8222-222222222222'::uuid,
    350, 0,
    'Replace the socket and test the circuit. Materials are not needed.',
    now() - interval '19 days', now() - interval '12 days', 'selected', now() - interval '19 days'
  ),
  (
    'f0000007-0000-4000-8000-000000000007'::uuid,
    'c0000007-0000-4000-8000-000000000007'::uuid,
    '33333333-3333-4333-8333-333333333333'::uuid,
    1100, 250,
    'Replace the leaking trap and the flexible connectors, then test the drainage.',
    now() - interval '30 days', now() - interval '23 days', 'selected', now() - interval '30 days'
  )
on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- 8. Bookings
-- ---------------------------------------------------------------------
insert into public.bookings (
  id, job_id, quotation_id, customer_id, professional_id, scheduled_at,
  status, accepted_at, started_at, completed_at, created_at
)
select
  'b0000001-0000-4000-8000-000000000001'::uuid,
  'c0000001-0000-4000-8000-000000000001'::uuid,
  'f0000001-0000-4000-8000-000000000001'::uuid,
  p.id, '11111111-1111-4111-8111-111111111111'::uuid,
  now() - interval '2 days', 'booked', now() - interval '4 days',
  now() - interval '4 days', null, now() - interval '4 days'
from public.profiles p where p.full_name = 'Jane Demo'
on conflict (id) do nothing;

insert into public.bookings (
  id, job_id, quotation_id, customer_id, professional_id, scheduled_at,
  status, accepted_at, started_at, completed_at, created_at
)
select
  'b0000005-0000-4000-8000-000000000005'::uuid,
  'c0000005-0000-4000-8000-000000000005'::uuid,
  'f0000005-0000-4000-8000-000000000005'::uuid,
  p.id, '22222222-2222-4222-8222-222222222222'::uuid,
  now() - interval '18 days', 'completed', now() - interval '19 days',
  now() - interval '17 days', now() - interval '16 days', now() - interval '19 days'
from public.profiles p where p.full_name = 'Jane Demo'
on conflict (id) do nothing;

insert into public.bookings (
  id, job_id, quotation_id, customer_id, professional_id, scheduled_at,
  status, accepted_at, started_at, completed_at, created_at
)
select
  'b0000007-0000-4000-8000-000000000007'::uuid,
  'c0000007-0000-4000-8000-000000000007'::uuid,
  'f0000007-0000-4000-8000-000000000007'::uuid,
  p.id, '33333333-3333-4333-8333-333333333333'::uuid,
  now() - interval '29 days', 'completed', now() - interval '30 days',
  now() - interval '28 days', now() - interval '27 days', now() - interval '30 days'
from public.profiles p where p.full_name = 'Jane Demo'
on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- 9. Messages
-- ---------------------------------------------------------------------
insert into public.messages (id, booking_id, sender_id, body, read_at, created_at)
select
  '9a000001-0000-4000-8000-000000000001'::uuid,
  'b0000001-0000-4000-8000-000000000001'::uuid,
  p.id, 'Hello, I am coming on Monday morning. Will the water be off all day?',
  now() - interval '3 days', now() - interval '3 days' - interval '10 minutes'
from public.profiles p where p.full_name = 'Jane Demo'
on conflict (id) do nothing;

insert into public.messages (id, booking_id, sender_id, body, read_at, created_at)
select
  '9a000001-0000-4000-8000-000000000002'::uuid,
  'b0000001-0000-4000-8000-000000000001'::uuid,
  pr.profile_id, 'Only for about an hour, and I will leave the water on in the street.',
  now() - interval '3 days', now() - interval '3 days'
from public.professionals pr where pr.id = '11111111-1111-4111-8111-111111111111'::uuid
on conflict (id) do nothing;

insert into public.messages (id, booking_id, sender_id, body, read_at, created_at)
select
  '9a000001-0000-4000-8000-000000000003'::uuid,
  'b0000001-0000-4000-8000-000000000001'::uuid,
  p.id, 'Perfect, thank you.', null, now() - interval '2 days'
from public.profiles p where p.full_name = 'Jane Demo'
on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- 10. Notifications
-- ---------------------------------------------------------------------
insert into public.notifications (id, user_id, type, title, body, data, dedupe_key, read_at, created_at)
select
  '7a000001-0000-4000-8000-000000000001'::uuid,
  p.id, 'quotation.received', 'You received a quotation',
  'A professional sent a quotation for "Leaking pipe under the kitchen sink".',
  '{"jobId":"c0000001-0000-4000-8000-000000000001"}'::jsonb,
  'demo:quotation:1', null, now() - interval '5 days'
from public.profiles p where p.full_name = 'Jane Demo'
on conflict (id) do nothing;

insert into public.notifications (id, user_id, type, title, body, data, dedupe_key, read_at, created_at)
select
  '7a000001-0000-4000-8000-000000000002'::uuid,
  p.id, 'booking.created', 'Booking created',
  'Your booking is confirmed. You can message your professional in the app.',
  '{"jobId":"c0000001-0000-4000-8000-000000000001","bookingId":"b0000001-0000-4000-8000-000000000001"}'::jsonb,
  'demo:booking:1', null, now() - interval '4 days'
from public.profiles p where p.full_name = 'Jane Demo'
on conflict (id) do nothing;

insert into public.notifications (id, user_id, type, title, body, data, dedupe_key, read_at, created_at)
select
  '7a000002-0000-4000-8000-000000000003'::uuid,
  pr.profile_id, 'job.match_available', 'New job request near you',
  'A plumbing job request in Dire Dawa is available. Review it and send a quotation.',
  '{"jobId":"c0000003-0000-4000-8000-000000000003"}'::jsonb,
  'demo:match:3', null, now() - interval '1 day'
from public.professionals pr where pr.id = '33333333-3333-4333-8333-333333333333'::uuid
on conflict (id) do nothing;

insert into public.notifications (id, user_id, type, title, body, data, dedupe_key, read_at, created_at)
select
  '7a000003-0000-4000-8000-000000000004'::uuid,
  pr.profile_id, 'review.received', 'You received a review',
  'You received a 5 star review for a completed job.',
  '{"bookingId":"b0000005-0000-4000-8000-000000000005"}'::jsonb,
  'demo:review:5', now() - interval '15 days', now() - interval '16 days'
from public.professionals pr where pr.id = '22222222-2222-4222-8222-222222222222'::uuid
on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- 11. Reviews
-- ---------------------------------------------------------------------
insert into public.reviews (
  id, booking_id, reviewer_id, professional_id, rating, comment, created_at
)
select
  '6a000001-0000-4000-8000-000000000001'::uuid,
  'b0000005-0000-4000-8000-000000000005'::uuid,
  p.id, '22222222-2222-4222-8222-222222222222'::uuid, 5,
  'Quick and clean work, arrived on time and explained everything.',
  now() - interval '16 days'
from public.profiles p where p.full_name = 'Jane Demo'
on conflict (id) do nothing;

insert into public.reviews (
  id, booking_id, reviewer_id, professional_id, rating, comment, created_at
)
select
  '6a000001-0000-4000-8000-000000000002'::uuid,
  'b0000007-0000-4000-8000-000000000007'::uuid,
  p.id, '33333333-3333-4333-8333-333333333333'::uuid, 5,
  'Fixed the trap in half an hour and left the place clean.',
  now() - interval '27 days'
from public.profiles p where p.full_name = 'Jane Demo'
on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- 12. A complaint, for the admin screens
-- ---------------------------------------------------------------------
insert into public.reports (
  id, reporter_id, reported_user_id, booking_id, reason, details, status, created_at
)
select
  '5a000001-0000-4000-8000-000000000001'::uuid,
  p.id, null, 'b0000001-0000-4000-8000-000000000001'::uuid, 'poor_quality',
  'The professional arrived three hours after the agreed time and did not call to explain the delay.',
  'open', now() - interval '2 days'
from public.profiles p where p.full_name = 'Jane Demo'
on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- 13. The audit log
-- ---------------------------------------------------------------------
insert into public.audit_log (id, actor_id, actor_role, action, entity_type, entity_id, details, created_at)
select
  '4a000001-0000-4000-8000-000000000001'::uuid,
  p.id, 'admin', 'professional.verification_approved', 'professional',
  '33333333-3333-4333-8333-333333333333'::uuid,
  '{"previousStatus":"pending","newStatus":"approved"}'::jsonb,
  now() - interval '10 days'
from public.profiles p where p.full_name = 'Marta Demo'
on conflict (id) do nothing;

insert into public.audit_log (id, actor_id, actor_role, action, entity_type, entity_id, details, created_at)
select
  '4a000001-0000-4000-8000-000000000002'::uuid,
  p.id, 'admin', 'account.status_suspended', 'profile',
  p.id, '{"previousStatus":"active","newStatus":"suspended","reason":"Demo record"}'::jsonb,
  now() - interval '3 days'
from public.profiles p where p.full_name = 'Marta Demo'
on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- 14. The matching configuration of the pilot
-- ---------------------------------------------------------------------
insert into public.matching_config (
  id, batch_size, timeout_minutes, radius_expansion_km, max_search_radius_km,
  max_expansion_rounds, expiration_hours, max_concurrent_jobs
)
values (1, 5, 30, 5, 25, 3, 72, 5)
on conflict (id) do update set
  batch_size = excluded.batch_size,
  timeout_minutes = excluded.timeout_minutes,
  radius_expansion_km = excluded.radius_expansion_km,
  max_search_radius_km = excluded.max_search_radius_km,
  max_expansion_rounds = excluded.max_expansion_rounds,
  expiration_hours = excluded.expiration_hours,
  max_concurrent_jobs = excluded.max_concurrent_jobs;
