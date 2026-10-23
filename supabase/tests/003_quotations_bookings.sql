-- =====================================================================
-- pgTAP — quotations, booking integrity and reviews (SRS §11, §14)
-- =====================================================================
-- The heart of the marketplace: a customer accepts exactly one
-- quotation, a job never gets two live bookings, and a review can only
-- be written for a completed booking.
-- =====================================================================
begin;
select plan(16);

-- ---------------------------------------------------------------------
-- The fixtures
-- ---------------------------------------------------------------------
do $$
declare
  v_customer uuid;
  v_other uuid;
  v_pro_a uuid;
  v_pro_b uuid;
  v_pending uuid;
  v_job uuid;
  v_category uuid;
begin
  v_customer := fixlink_test.create_user('t3-customer@fixlink.test', 'customer');
  v_other := fixlink_test.create_user('t3-other@fixlink.test', 'customer');
  v_pro_a := fixlink_test.create_user('t3-pro-a@fixlink.test', 'professional', 'active', true);
  v_pro_b := fixlink_test.create_user('t3-pro-b@fixlink.test', 'professional', 'active', true);
  v_pending := fixlink_test.create_user('t3-pending@fixlink.test', 'professional', 'active', true, 'pending');

  v_category := fixlink_test.ensure_category();
  v_job := fixlink_test.create_job(v_customer);

  perform fixlink_test.offer_service(fixlink_test.professional_of(v_pro_a), v_category);
  perform fixlink_test.offer_service(fixlink_test.professional_of(v_pro_b), v_category);
  perform fixlink_test.offer_service(fixlink_test.professional_of(v_pending), v_category);

  -- Both professionals were matched to the request.
  insert into public.job_matches (job_id, professional_id, score)
  values (v_job, fixlink_test.professional_of(v_pro_a), 0.9),
         (v_job, fixlink_test.professional_of(v_pro_b), 0.8);
end $$;

-- ---------------------------------------------------------------------
-- A professional who was not matched may not quote
-- ---------------------------------------------------------------------
set local role authenticated;
do $$
begin
  perform fixlink_test.create_user('t3-stranger@fixlink.test', 'professional', 'active', true);
end $$;
do $$
begin
  perform fixlink_test.offer_service(
    fixlink_test.professional_of(fixlink_test.user_by_email('t3-stranger@fixlink.test'))
  );
end $$;
do $$
begin
  perform fixlink_test.as_user(fixlink_test.user_by_email('t3-stranger@fixlink.test'));
end $$;

select throws_ok(
  'select public.submit_quotation(
     (select id from public.job_requests where title = ''The tap in the kitchen is leaking''),
     1000, 0, ''Replacing the tap washer and the joint.''
   )',
  '42501',
  'a professional who was not matched may not quote'
);

-- ---------------------------------------------------------------------
-- A pending professional may not quote
-- ---------------------------------------------------------------------
do $$
begin
  perform fixlink_test.as_user(fixlink_test.user_by_email('t3-pending@fixlink.test'));
end $$;

select throws_ok(
  'select public.submit_quotation(
     (select id from public.job_requests where title = ''The tap in the kitchen is leaking''),
     1000, 0, ''Replacing the tap washer and the joint.''
   )',
  '42501',
  'a professional who is not verified may not quote'
);

-- ---------------------------------------------------------------------
-- A negative price is refused
-- ---------------------------------------------------------------------
do $$
begin
  perform fixlink_test.as_user(fixlink_test.user_by_email('t3-pro-a@fixlink.test'));
end $$;

select throws_ok(
  'select public.submit_quotation(
     (select id from public.job_requests where title = ''The tap in the kitchen is leaking''),
     -100, 0, ''Replacing the tap washer and the joint.''
   )',
  '22023',
  'a negative price is refused'
);

-- ---------------------------------------------------------------------
-- A matched, verified professional may quote
-- ---------------------------------------------------------------------
select lives_ok(
  'select public.submit_quotation(
     (select id from public.job_requests where title = ''The tap in the kitchen is leaking''),
     1500, 250, ''Replacing the tap washer and the joint.''
   )',
  'a matched, verified professional may quote'
);

select is(
  (
    select count(*)::int from public.quotations
    where labor_cost_etb = 1500 and materials_cost_etb = 250
  ),
  1,
  'the quotation is stored in ETB'
);

-- ---------------------------------------------------------------------
-- Only the customer who owns the job may accept a quotation
-- ---------------------------------------------------------------------
do $$
begin
  perform fixlink_test.as_user(fixlink_test.user_by_email('t3-other@fixlink.test'));
end $$;

select throws_ok(
  'select public.accept_quotation(
     (select id from public.quotations where labor_cost_etb = 1500)
   )',
  '42501',
  'another customer may not accept a quotation'
);

-- ---------------------------------------------------------------------
-- The owner accepts, and the booking is created atomically
-- ---------------------------------------------------------------------
do $$
begin
  perform fixlink_test.as_user(fixlink_test.user_by_email('t3-customer@fixlink.test'));
end $$;

select lives_ok(
  'select public.accept_quotation(
     (select id from public.quotations where labor_cost_etb = 1500)
   )',
  'the owner of the job may accept a quotation'
);

select is(
  (select count(*)::int from public.bookings),
  1,
  'exactly one booking was created'
);

select is(
  (
    select status from public.quotations where labor_cost_etb = 1500
  ),
  'selected'::public.quotation_status,
  'the accepted quotation is selected'
);

select is(
  (
    select status from public.job_requests
    where title = 'The tap in the kitchen is leaking'
  ),
  'booked'::public.job_status,
  'the job moved to booked'
);

select is(
  (
    select count(*)::int from public.job_status_events
    where to_status = 'booked'
  ),
  1,
  'the status change was recorded'
);

-- ---------------------------------------------------------------------
-- A second quotation of the same job cannot create a second booking
-- ---------------------------------------------------------------------
do $$
begin
  perform fixlink_test.as_user(fixlink_test.user_by_email('t3-pro-b@fixlink.test'));
end $$;

select lives_ok(
  'select public.submit_quotation(
     (select id from public.job_requests where title = ''The tap in the kitchen is leaking''),
     2000, 0, ''A second quotation for the same job.''
   )',
  'the second professional may quote'
);

do $$
begin
  perform fixlink_test.as_user(fixlink_test.user_by_email('t3-customer@fixlink.test'));
end $$;

select throws_ok(
  'select public.accept_quotation(
     (select id from public.quotations where labor_cost_etb = 2000)
   )',
  '23505',
  'a job cannot get a second live booking'
);

select is(
  (select count(*)::int from public.bookings),
  1,
  'there is still exactly one booking'
);

-- ---------------------------------------------------------------------
-- A review needs a completed booking
-- ---------------------------------------------------------------------
select throws_ok(
  'select public.create_review(
     (select id from public.bookings), 5, ''Great work.''
   )',
  '22023',
  'a booking that is not completed cannot be reviewed'
);

do $$
begin
  perform public.transition_booking(
    (select id from public.bookings), 'in_progress', null
  );
  perform public.transition_booking(
    (select id from public.bookings), 'completed', null
  );
end $$;

select lives_ok(
  'select public.create_review(
     (select id from public.bookings), 5, ''Great work.''
   )',
  'a completed booking can be reviewed'
);

select throws_ok(
  'select public.create_review(
     (select id from public.bookings), 4, ''A second review.''
   )',
  '23505',
  'a booking can only be reviewed once'
);

select * from finish();
rollback;
