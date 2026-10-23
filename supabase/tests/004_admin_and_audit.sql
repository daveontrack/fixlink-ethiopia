-- =====================================================================
-- pgTAP — administrator actions, the audit trail and notifications
-- =====================================================================
-- Every sensitive operation must be refused to a normal user, allowed
-- to an administrator, and leave an audit record behind.
-- =====================================================================
begin;
select plan(12);

-- ---------------------------------------------------------------------
-- The fixtures
-- ---------------------------------------------------------------------
do $$
declare
  v_admin uuid;
  v_pro uuid;
  v_customer uuid;
begin
  v_admin := fixlink_test.create_user('t4-admin@fixlink.test', 'admin');
  v_pro := fixlink_test.create_user('t4-pro@fixlink.test', 'professional', 'active', true, 'pending');
  v_customer := fixlink_test.create_user('t4-customer@fixlink.test', 'customer');

  insert into public.notifications (user_id, type, title, body)
  values (
    fixlink_test.profile_of(v_customer), 'booking_created',
    'Your booking is confirmed', 'See you tomorrow.'
  );
end $$;

-- ---------------------------------------------------------------------
-- A customer may not approve a professional
-- ---------------------------------------------------------------------
set local role authenticated;
do $$
begin
  perform fixlink_test.as_user(fixlink_test.user_by_email('t4-customer@fixlink.test'));
end $$;

select throws_ok(
  'select public.set_verification_status(
     fixlink_test.professional_of(fixlink_test.user_by_email(''t4-pro@fixlink.test'')),
     ''approved'', null
   )',
  '42501',
  'a customer may not approve a professional'
);

select throws_ok(
  'select public.set_account_status(
     fixlink_test.profile_of(fixlink_test.user_by_email(''t4-customer@fixlink.test'')),
     ''suspended'', null
   )',
  '42501',
  'a customer may not suspend an account'
);

-- ---------------------------------------------------------------------
-- A professional may not approve themselves
-- ---------------------------------------------------------------------
do $$
begin
  perform fixlink_test.as_user(fixlink_test.user_by_email('t4-pro@fixlink.test'));
end $$;

select throws_ok(
  'select public.set_verification_status(
     fixlink_test.professional_of(fixlink_test.user_by_email(''t4-pro@fixlink.test'')),
     ''approved'', null
   )',
  '42501',
  'a professional may not approve themselves'
);

-- ---------------------------------------------------------------------
-- Nobody may promote themselves to administrator
-- ---------------------------------------------------------------------
select is(
  (
    select has_function_privilege(
      'authenticated', 'public.grant_admin(uuid, text)', 'EXECUTE'
    )
  ),
  false,
  'a client may not call grant_admin()'
);

select throws_ok(
  'update public.profiles set role = ''admin'' where auth_user_id = fixlink_test.user_by_email(''t4-customer@fixlink.test'')',
  '42501',
  'a client may not write the role column'
);

-- ---------------------------------------------------------------------
-- The notifications belong to their owner
-- ---------------------------------------------------------------------
do $$
begin
  perform fixlink_test.as_user(fixlink_test.user_by_email('t4-customer@fixlink.test'));
end $$;

select is(
  (select count(*)::int from public.notifications where read_at is null),
  1,
  'the customer has one unread notification'
);

select lives_ok(
  'select public.mark_notifications_read(null)',
  'the customer may mark their notifications as read'
);

select is(
  (select count(*)::int from public.notifications where read_at is null),
  0,
  'the notification is now read'
);

-- ---------------------------------------------------------------------
-- The administrator may approve, and it leaves an audit record
-- ---------------------------------------------------------------------
do $$
begin
  perform fixlink_test.as_user(fixlink_test.user_by_email('t4-admin@fixlink.test'));
end $$;

select lives_ok(
  'select public.set_verification_status(
     fixlink_test.professional_of(fixlink_test.user_by_email(''t4-pro@fixlink.test'')),
     ''approved'', ''The documents were checked.''
   )',
  'an administrator may approve a professional'
);

select is(
  (
    select verification_status from public.professionals
    where profile_id = fixlink_test.profile_of(fixlink_test.user_by_email('t4-pro@fixlink.test'))
  ),
  'approved'::public.verification_status,
  'the professional is approved'
);

select is(
  (
    select count(*)::int from public.audit_log
    where action = 'professional.verification_approved'
  ),
  1,
  'the decision was written to the audit log'
);

select is(
  (
    select count(*)::int from public.audit_log
    where actor_id = fixlink_test.profile_of(fixlink_test.user_by_email('t4-admin@fixlink.test'))
  ),
  1,
  'the audit record names the administrator'
);

-- ---------------------------------------------------------------------
-- An administrator may suspend an account
-- ---------------------------------------------------------------------
select lives_ok(
  'select public.set_account_status(
     fixlink_test.profile_of(fixlink_test.user_by_email(''t4-customer@fixlink.test'')),
     ''suspended'', ''Reported by a professional.''
   )',
  'an administrator may suspend an account'
);

select is(
  (
    select account_status from public.profiles
    where auth_user_id = fixlink_test.user_by_email('t4-customer@fixlink.test')
  ),
  'suspended'::public.account_status,
  'the account is suspended'
);

select * from finish();
rollback;
