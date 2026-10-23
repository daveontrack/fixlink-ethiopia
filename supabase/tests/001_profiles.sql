-- =====================================================================
-- pgTAP — profiles, ownership and the protected columns (SRS §7, §15)
-- =====================================================================
-- The tests run as the database owner (postgres) while they arrange the
-- fixtures, then switch to the `authenticated` role to act as a real
-- client. The GUC `request.jwt.claims` is what PostgREST sets, so the
-- database resolves the caller exactly as it does in production.
-- =====================================================================
begin;
select plan(18);

-- ---------------------------------------------------------------------
-- The fixtures
-- ---------------------------------------------------------------------
do $$
begin
  perform fixlink_test.create_user('t1-customer@fixlink.test', 'customer');
  perform fixlink_test.create_user('t1-other@fixlink.test', 'customer');
  perform fixlink_test.create_user('t1-admin@fixlink.test', 'admin');
end $$;

-- ---------------------------------------------------------------------
-- The profile is created with the account
-- ---------------------------------------------------------------------
select is(
  (
    select count(*)::int
    from public.profiles p
    where p.email = 't1-customer@fixlink.test'
  ),
  1,
  'a sign-up creates exactly one profile'
);

select is(
  (
    select p.id is not null
    from public.profiles p
    where p.email = 't1-customer@fixlink.test'
  ),
  true,
  'the profile carries a uuid'
);

-- ---------------------------------------------------------------------
-- The identity helpers
-- ---------------------------------------------------------------------
select is(
  fixlink_test.profile_of(fixlink_test.user_by_email('t1-customer@fixlink.test')),
  (
    select p.id
    from public.profiles p
    where p.email = 't1-customer@fixlink.test'
  ),
  'profile_of() finds the profile of an auth user'
);

-- Act as the customer, exactly as PostgREST would.
set local role authenticated;
do $$
begin
  perform fixlink_test.as_user(fixlink_test.user_by_email('t1-customer@fixlink.test'));
end $$;

select is(
  public.current_auth_user_id(),
  fixlink_test.user_by_email('t1-customer@fixlink.test'),
  'current_auth_user_id() reads the sub claim'
);

select is(
  public.current_profile_id(),
  fixlink_test.profile_of(fixlink_test.user_by_email('t1-customer@fixlink.test')),
  'current_profile_id() resolves the profile of the caller'
);

select is(
  public.current_user_role(),
  'customer'::public.user_role,
  'current_user_role() returns the role of the profile'
);

select is(
  public.is_active_account(),
  true,
  'the caller owns an active account'
);

select is(
  public.is_admin(),
  false,
  'a customer is not an administrator'
);

-- ---------------------------------------------------------------------
-- An anonymous request
-- ---------------------------------------------------------------------
set local role anon;
do $$
begin
  perform fixlink_test.as_anon();
end $$;

select is(
  public.current_auth_user_id(),
  null,
  'an anonymous request has no auth user id'
);

select is(
  public.current_profile_id(),
  null,
  'an anonymous request has no profile'
);

select is(
  public.is_admin(),
  false,
  'an anonymous request is not an administrator'
);

-- ---------------------------------------------------------------------
-- ensure_profile
-- ---------------------------------------------------------------------
set local role authenticated;
do $$
begin
  perform fixlink_test.as_user(fixlink_test.user_by_email('t1-customer@fixlink.test'));
end $$;

select lives_ok(
  'select public.ensure_profile(''Jane Customer'', ''+251911000001'', null)',
  'ensure_profile() succeeds for a signed-in caller'
);

select is(
  (
    select full_name from public.profiles
    where auth_user_id = fixlink_test.user_by_email('t1-customer@fixlink.test')
  ),
  'Jane Customer',
  'ensure_profile() writes the name'
);

-- Calling it twice must not create a second profile.
select lives_ok(
  'select public.ensure_profile(null, null, null)',
  'ensure_profile() is idempotent'
);

select is(
  (
    select count(*)::int from public.profiles
    where auth_user_id = fixlink_test.user_by_email('t1-customer@fixlink.test')
  ),
  1,
  'ensure_profile() never creates a second profile'
);

-- ---------------------------------------------------------------------
-- The protected columns
-- ---------------------------------------------------------------------
-- The column grant is the first line of defence: the owner may update
-- their profile, but not the protected columns.
select is(
  (
    select has_column_privilege(
      'authenticated', 'public.profiles', 'role', 'UPDATE'
    )
  ),
  false,
  'the authenticated role may not write the role column'
);

select is(
  (
    select has_column_privilege(
      'authenticated', 'public.profiles', 'account_status', 'UPDATE'
    )
  ),
  false,
  'the authenticated role may not write the account_status column'
);

select throws_ok(
  'update public.profiles set role = ''admin'' where auth_user_id = fixlink_test.user_by_email(''t1-customer@fixlink.test'')',
  '42501',
  'a customer cannot promote themselves to administrator'
);

select throws_ok(
  'update public.profiles set account_status = ''suspended'' where auth_user_id = fixlink_test.user_by_email(''t1-customer@fixlink.test'')',
  '42501',
  'a customer cannot suspend themselves'
);

select * from finish();
rollback;
