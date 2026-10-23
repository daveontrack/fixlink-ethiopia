-- =====================================================================
-- pgTAP — Row Level Security (SRS §15)
-- =====================================================================
-- Every test here acts as a real client: the session is switched to the
-- `authenticated` role and the caller identity is set through
-- `request.jwt.claims`, exactly the way PostgREST does it. The counts
-- therefore prove what a caller may read, not what the policy says.
-- =====================================================================
begin;
select plan(14);

-- ---------------------------------------------------------------------
-- The fixtures
-- ---------------------------------------------------------------------
do $$
declare
  v_customer uuid;
  v_other uuid;
  v_pro uuid;
  v_admin uuid;
  v_job uuid;
  v_booking uuid;
  v_quotation uuid;
begin
  v_customer := fixlink_test.create_user('t2-customer@fixlink.test', 'customer');
  v_other := fixlink_test.create_user('t2-other@fixlink.test', 'customer');
  v_pro := fixlink_test.create_user('t2-pro@fixlink.test', 'professional', 'active', true);
  v_admin := fixlink_test.create_user('t2-admin@fixlink.test', 'admin');

  v_job := fixlink_test.create_job(v_customer);

  -- The professional was matched to the request.
  insert into public.job_matches (job_id, professional_id, score)
  values (v_job, fixlink_test.professional_of(v_pro), 0.9);

  -- A quotation, a booking and a message on top of it.
  insert into public.quotations (
    job_id, professional_id, labor_cost_etb, materials_cost_etb, notes, valid_until
  )
  values (
    v_job, fixlink_test.professional_of(v_pro), 1500, 250,
    'Replacing the tap washer and the joint.', now() + interval '7 days'
  )
  returning id into v_quotation;

  insert into public.bookings (
    job_id, quotation_id, customer_id, professional_id, scheduled_at
  )
  values (
    v_job, v_quotation, fixlink_test.profile_of(v_customer),
    fixlink_test.professional_of(v_pro), now() + interval '1 day'
  )
  returning id into v_booking;

  insert into public.messages (booking_id, sender_id, body)
  values (v_booking, fixlink_test.profile_of(v_customer), 'What time will you come?');

  insert into public.notifications (user_id, type, title, body)
  values (
    fixlink_test.profile_of(v_customer), 'booking_created',
    'Your booking is confirmed', 'See you tomorrow.'
  );
end $$;

-- ---------------------------------------------------------------------
-- The customer sees their own request
-- ---------------------------------------------------------------------
set local role authenticated;
do $$
begin
  perform fixlink_test.as_user(fixlink_test.user_by_email('t2-customer@fixlink.test'));
end $$;

select is(
  (select count(*)::int from public.job_requests),
  1,
  'the customer sees their own request'
);

select is(
  (select count(*)::int from public.notifications),
  1,
  'the customer sees their own notification'
);

select is(
  (select count(*)::int from public.messages),
  1,
  'the customer sees the message of their booking'
);

-- ---------------------------------------------------------------------
-- Another customer sees nothing
-- ---------------------------------------------------------------------
do $$
begin
  perform fixlink_test.as_user(fixlink_test.user_by_email('t2-other@fixlink.test'));
end $$;

select is(
  (select count(*)::int from public.job_requests),
  0,
  'another customer sees no request'
);

select is(
  (select count(*)::int from public.notifications),
  0,
  'another customer sees no notification'
);

select is(
  (select count(*)::int from public.messages),
  0,
  'another customer sees no message'
);

select is(
  (select count(*)::int from public.bookings),
  0,
  'another customer sees no booking'
);

-- ---------------------------------------------------------------------
-- The matched professional sees the request, and only that one
-- ---------------------------------------------------------------------
do $$
begin
  perform fixlink_test.as_user(fixlink_test.user_by_email('t2-pro@fixlink.test'));
end $$;

select is(
  (select count(*)::int from public.job_requests),
  1,
  'the matched professional sees the request they were notified about'
);

select is(
  (select count(*)::int from public.messages),
  1,
  'the professional sees the message of their booking'
);

select is(
  (select count(*)::int from public.notifications),
  0,
  'the professional sees no notification of the customer'
);

-- ---------------------------------------------------------------------
-- The administrator sees everything
-- ---------------------------------------------------------------------
do $$
begin
  perform fixlink_test.as_user(fixlink_test.user_by_email('t2-admin@fixlink.test'));
end $$;

select is(
  (select count(*)::int from public.job_requests),
  1,
  'the administrator sees the request'
);

select is(
  (select count(*)::int from public.profiles),
  4,
  'the administrator sees every profile'
);

-- ---------------------------------------------------------------------
-- An anonymous visitor sees the catalogue only
-- ---------------------------------------------------------------------
set local role anon;
do $$
begin
  perform fixlink_test.as_anon();
end $$;

select is(
  (
    select count(*)::int
    from public.job_requests
  ),
  0,
  'an anonymous visitor sees no request'
);

select * from finish();
rollback;
