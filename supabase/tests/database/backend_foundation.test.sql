begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(37);

select has_table('public', 'countries', 'countries table exists');
select has_table('public', 'trips', 'trips table exists');
select has_table('public', 'memories', 'memories table exists');
select has_table('public', 'data_export_jobs', 'data export jobs table exists');
select has_table('public', 'account_deletion_requests', 'account deletion requests table exists');
select ok(
  (select reloptions @> array['security_invoker=true'] from pg_class where oid = 'public.personal_statistics'::regclass),
  'statistics view uses invoker security'
);
select is(
  (select count(*)::integer from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relname in ('countries','profiles','user_preferences','trips','memories','travel_companions','trip_companions','places','bucket_list','data_export_jobs','account_deletion_requests','trip_days') and c.relrowsecurity),
  12,
  'all exposed application tables have RLS enabled'
);
select ok(
  not (select public from storage.buckets where id = 'user-exports'),
  'user export bucket is private'
);
select is(
  (select count(*)::integer from pg_policies where schemaname = 'storage' and policyname like '%export%'),
  0,
  'no client storage policy exposes export objects'
);
select is((select count(*)::integer from public.countries where is_active), 250, '250 active country and territory references are seeded');
select is((select count(*)::integer from public.countries where counts_toward_world_total), 195, 'statistics denominator contains 195 states');

insert into auth.users (id, email, encrypted_password, email_confirmed_at, aud, role)
values
  ('11111111-1111-4111-8111-111111111111', 'user-a@example.test', crypt('Password123', gen_salt('bf')), now(), 'authenticated', 'authenticated'),
  ('22222222-2222-4222-8222-222222222222', 'user-b@example.test', crypt('Password123', gen_salt('bf')), now(), 'authenticated', 'authenticated');

select is((select count(*)::integer from public.profiles where id in ('11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222')), 2, 'auth trigger creates profiles');
select is((select count(*)::integer from public.user_preferences where user_id in ('11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222')), 2, 'auth trigger creates preferences');
select ok(not has_function_privilege('authenticated', 'private.create_user_defaults()', 'EXECUTE'), 'authenticated users cannot call the privileged profile bootstrap function');
select ok(not has_function_privilege('authenticated', 'private.prepare_memory_paths()', 'EXECUTE'), 'authenticated users cannot call the path trigger function directly');

insert into public.trips (id, user_id, country_code, name, start_date, end_date)
values ('cccccccc-cccc-4ccc-8ccc-ccccccccccc1', '22222222-2222-4222-8222-222222222222', 'JP', 'User B trip', '2024-03-01', '2024-03-02');

insert into public.data_export_jobs (id, user_id, status)
values
  ('dddddddd-dddd-4ddd-8ddd-ddddddddddd1', '11111111-1111-4111-8111-111111111111', 'requested'),
  ('dddddddd-dddd-4ddd-8ddd-ddddddddddd2', '22222222-2222-4222-8222-222222222222', 'failed');

insert into public.account_deletion_requests (id, user_id, status)
values ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee2', '22222222-2222-4222-8222-222222222222', 'requested');

set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);

select is((select count(*)::integer from public.countries), 250, 'authenticated user can read active countries');
select is((select count(*)::integer from public.profiles), 1, 'user can read only their profile');
select is((select count(*)::integer from public.profiles where id = '22222222-2222-4222-8222-222222222222'), 0, 'user cannot read another profile');
select is((select count(*)::integer from public.data_export_jobs), 1, 'user can read only their export jobs');
select is((select count(*)::integer from public.data_export_jobs where user_id = '22222222-2222-4222-8222-222222222222'), 0, 'user cannot read another export job');
select is((select count(*)::integer from public.account_deletion_requests), 0, 'user cannot read another deletion request');
select ok(not has_table_privilege('authenticated', 'public.data_export_jobs', 'INSERT'), 'clients cannot create export jobs directly');
select ok(not has_table_privilege('authenticated', 'public.account_deletion_requests', 'INSERT'), 'clients cannot create deletion jobs directly');

insert into public.trips (id, country_code, name, start_date, end_date)
values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'FR', 'First France trip', '2024-01-01', '2024-01-05'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', 'FR', 'Second France trip', '2025-02-01', '2025-02-03');

select is((select count(*)::integer from public.trips where country_code = 'FR'), 2, 'multiple trips per country are supported');
select throws_ok(
  $$insert into public.trips (country_code, name, start_date, end_date) values ('JP', 'Invalid dates', '2025-05-02', '2025-05-01')$$,
  '23514',
  null,
  'invalid trip date range is rejected'
);
select throws_ok(
  $$insert into public.trips (user_id, country_code, name, start_date, end_date) values ('22222222-2222-4222-8222-222222222222', 'JP', 'Forged owner', '2025-05-01', '2025-05-02')$$,
  '42501',
  null,
  'forged trip owner is rejected by RLS'
);
select throws_ok(
  $$update public.trips set user_id = '22222222-2222-4222-8222-222222222222' where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'$$,
  '42501',
  null,
  'trip ownership reassignment is rejected by RLS'
);

insert into public.memories (
  id, trip_id, caption, original_mime_type, declared_size_bytes, declared_thumbnail_size_bytes
)
values (
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
  'Private memory',
  'image/jpeg',
  4,
  4
);

select ok(
  (select original_path like '11111111-1111-4111-8111-111111111111/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1/%.jpg'
   and thumbnail_path like '11111111-1111-4111-8111-111111111111/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1/thumbnail-%.jpg'
   from public.memories where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1'),
  'memory paths are generated inside the ownership boundary'
);
select throws_ok(
  $$insert into public.memories (trip_id, caption, original_mime_type, declared_size_bytes, declared_thumbnail_size_bytes) values ('cccccccc-cccc-4ccc-8ccc-ccccccccccc1', 'Cross owner', 'image/jpeg', 4, 4)$$,
  '23503',
  null,
  'memory cannot attach to another user trip'
);
select throws_ok(
  $$update public.memories set original_path = 'changed/path.jpg' where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1'$$,
  '22023',
  null,
  'generated storage paths are immutable'
);
select is((select total_trips::integer from public.personal_statistics), 2, 'statistics contain the callers trips');
select is((select countries_visited::integer from public.personal_statistics), 1, 'statistics derive visited countries from trips');

reset role;
insert into public.account_deletion_requests (id, user_id, status)
values ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1', '11111111-1111-4111-8111-111111111111', 'processing');
set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
select is((select count(*)::integer from public.account_deletion_requests), 1, 'user can read their deletion status');
select throws_ok(
  $$insert into public.memories (trip_id, original_mime_type, declared_size_bytes, declared_thumbnail_size_bytes) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'image/jpeg', 4, 4)$$,
  '55000',
  null,
  'new uploads are rejected once account deletion starts'
);

set local role anon;
select set_config('request.jwt.claim.sub', '', true);
select ok(not has_table_privilege('anon', 'public.trips', 'SELECT'), 'anonymous users cannot read trips');
select ok(not has_table_privilege('anon', 'public.memories', 'SELECT'), 'anonymous users cannot read memories');
select is((select count(*)::integer from public.countries), 250, 'anonymous users can read active country references');

reset role;
select * from finish();
rollback;
