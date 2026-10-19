begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(12);

select has_table('public', 'trip_days', 'trip days table exists');
select ok((select relrowsecurity from pg_class where oid = 'public.trip_days'::regclass), 'trip days have RLS enabled');
select ok(not has_table_privilege('anon', 'public.trip_days', 'SELECT'), 'anonymous users cannot read trip days');

insert into auth.users (id, email, encrypted_password, email_confirmed_at, aud, role)
values
  ('11111111-1111-4111-8111-111111111111', 'days-a@example.test', crypt('Password123', gen_salt('bf')), now(), 'authenticated', 'authenticated'),
  ('22222222-2222-4222-8222-222222222222', 'days-b@example.test', crypt('Password123', gen_salt('bf')), now(), 'authenticated', 'authenticated');

insert into public.trips (id, user_id, country_code, name, start_date, end_date)
values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', '11111111-1111-4111-8111-111111111111', 'JP', 'User A trip', '2030-04-01', '2030-04-03'),
  ('cccccccc-cccc-4ccc-8ccc-ccccccccccc1', '22222222-2222-4222-8222-222222222222', 'FR', 'User B trip', '2030-05-01', '2030-05-02');

insert into public.trip_days (user_id, trip_id, day_date, title, notes)
values ('22222222-2222-4222-8222-222222222222', 'cccccccc-cccc-4ccc-8ccc-ccccccccccc1', '2030-05-01', 'B day', 'B private plan');

set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);

insert into public.trip_days (trip_id, day_date, title, notes)
values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', '2030-04-02', 'Temples', 'Plan: Fushimi Inari at dawn');

select is((select count(*)::integer from public.trip_days), 1, 'a user can read only their own trip days');
select is((select count(*)::integer from public.trip_days where trip_id = 'cccccccc-cccc-4ccc-8ccc-ccccccccccc1'), 0, 'a user cannot read another user''s trip days');
select throws_ok(
  $$insert into public.trip_days (trip_id, day_date, notes) values ('cccccccc-cccc-4ccc-8ccc-ccccccccccc1', '2030-05-02', 'Cross owner')$$,
  '23503',
  null,
  'a day cannot attach to another user''s trip'
);
select throws_ok(
  $$insert into public.trip_days (user_id, trip_id, day_date, notes) values ('22222222-2222-4222-8222-222222222222', 'cccccccc-cccc-4ccc-8ccc-ccccccccccc1', '2030-05-02', 'Forged owner')$$,
  '42501',
  null,
  'a forged day owner is rejected by RLS'
);
select throws_ok(
  $$insert into public.trip_days (trip_id, day_date, notes) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', '2030-04-02', 'Duplicate day')$$,
  '23505',
  null,
  'a trip has at most one entry per calendar day'
);
select throws_ok(
  $$insert into public.trip_days (trip_id, day_date, title) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', '2030-04-03', repeat('x', 121))$$,
  '23514',
  null,
  'overlong day titles are rejected'
);

select lives_ok(
  $$update public.trip_days set places = array['Fushimi Inari', 'Gion'] where trip_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'$$,
  'a day can list the places visited'
);
select throws_ok(
  $$update public.trip_days set places = array_fill('x'::text, array[31]) where trip_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'$$,
  '23514',
  null,
  'a day cannot list more than thirty places'
);

reset role;
delete from public.trips where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';
select is((select count(*)::integer from public.trip_days where trip_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'), 0, 'deleting a trip removes its days');

select * from finish();
rollback;
