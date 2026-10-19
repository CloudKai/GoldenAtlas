begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(6);

insert into auth.users (id, email, encrypted_password, email_confirmed_at, aud, role)
values
  ('11111111-1111-4111-8111-111111111111', 'prefs-a@example.test', crypt('Password123', gen_salt('bf')), now(), 'authenticated', 'authenticated'),
  ('22222222-2222-4222-8222-222222222222', 'prefs-b@example.test', crypt('Password123', gen_salt('bf')), now(), 'authenticated', 'authenticated');

set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);

select lives_ok(
  $$update public.user_preferences set favourite_country_code = 'SG'$$,
  'a user can set their favourite country'
);
select is((select favourite_country_code from public.user_preferences), 'SG', 'the favourite country is stored on the account');
select throws_ok(
  $$update public.user_preferences set favourite_country_code = 'ZZ'$$,
  '23503',
  null,
  'the favourite country must be a real country'
);
select lives_ok(
  $$update public.user_preferences set slideshow_transition = 'dissolve'$$,
  'the dissolve transition is accepted'
);
select throws_ok(
  $$update public.user_preferences set slideshow_transition = 'spin'$$,
  '23514',
  null,
  'unknown transitions are rejected'
);

reset role;
select is((select favourite_country_code from public.user_preferences where user_id = '22222222-2222-4222-8222-222222222222'), null, 'another user''s preferences are unchanged');

select * from finish();
rollback;
