-- Golden Atlas backend foundation.
-- All application tables are explicitly granted and protected with RLS.

create extension if not exists pgcrypto with schema extensions;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table public.countries (
  iso_code text primary key,
  iso3_code text not null unique,
  numeric_code text,
  name text not null,
  official_name text,
  continent_code text not null,
  continent_name text not null,
  region text,
  subregion text,
  is_active boolean not null default true,
  counts_toward_world_total boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint countries_iso_code_format check (iso_code ~ '^[A-Z]{2}$'),
  constraint countries_iso3_code_format check (iso3_code ~ '^[A-Z]{3}$'),
  constraint countries_numeric_code_format check (numeric_code is null or numeric_code ~ '^[0-9]{3}$'),
  constraint countries_name_length check (char_length(name) between 1 and 120),
  constraint countries_official_name_length check (official_name is null or char_length(official_name) <= 180),
  constraint countries_continent_code_format check (continent_code ~ '^[A-Z]{2}$')
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_display_name_length check (display_name is null or char_length(display_name) between 1 and 80),
  constraint profiles_avatar_path_safe check (
    avatar_path is null or (
      char_length(avatar_path) <= 500
      and avatar_path !~ '(^|/)\.\.(/|$)'
      and avatar_path !~ '[[:cntrl:]]'
    )
  )
);

create table public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  theme text not null default 'system',
  reduced_motion boolean not null default false,
  remove_photo_gps_by_default boolean not null default true,
  analytics_consent boolean not null default false,
  slideshow_duration_seconds smallint not null default 5,
  slideshow_order text not null default 'chronological',
  show_slideshow_caption boolean not null default true,
  show_slideshow_date boolean not null default true,
  show_slideshow_country boolean not null default true,
  show_slideshow_city boolean not null default true,
  slideshow_transition text not null default 'fade',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_preferences_theme_valid check (theme in ('system', 'light', 'dark')),
  constraint user_preferences_duration_valid check (slideshow_duration_seconds between 2 and 30),
  constraint user_preferences_order_valid check (slideshow_order in ('chronological', 'reverse_chronological', 'random')),
  constraint user_preferences_transition_valid check (slideshow_transition in ('fade', 'slide', 'none'))
);

create table public.trips (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  country_code text not null references public.countries(iso_code),
  name text not null,
  city text,
  region text,
  start_date date not null,
  end_date date not null,
  journal text,
  favourite_memory text,
  mood text,
  rating smallint,
  expense_amount numeric(12,2),
  expense_currency text,
  is_favourite boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trips_id_user_unique unique (id, user_id),
  constraint trips_id_user_country_unique unique (id, user_id, country_code),
  constraint trips_name_length check (char_length(name) between 1 and 120),
  constraint trips_city_length check (city is null or char_length(city) <= 160),
  constraint trips_region_length check (region is null or char_length(region) <= 160),
  constraint trips_date_order check (end_date >= start_date),
  constraint trips_journal_length check (journal is null or char_length(journal) <= 50000),
  constraint trips_favourite_memory_length check (favourite_memory is null or char_length(favourite_memory) <= 5000),
  constraint trips_mood_length check (mood is null or char_length(mood) <= 32),
  constraint trips_rating_range check (rating is null or rating between 1 and 5),
  constraint trips_expense_nonnegative check (expense_amount is null or expense_amount >= 0),
  constraint trips_currency_format check (expense_currency is null or expense_currency ~ '^[A-Z]{3}$')
);

create table public.memories (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  trip_id uuid not null,
  original_path text not null default '',
  thumbnail_path text not null default '',
  caption text,
  location_label text,
  taken_at timestamptz,
  display_order integer not null default 0,
  is_favourite boolean not null default false,
  original_mime_type text not null,
  declared_size_bytes bigint not null,
  declared_thumbnail_size_bytes bigint not null,
  stored_size_bytes bigint,
  stored_thumbnail_size_bytes bigint,
  width integer,
  height integer,
  upload_status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint memories_id_user_unique unique (id, user_id),
  constraint memories_trip_owner_fkey foreign key (trip_id, user_id)
    references public.trips(id, user_id) on delete restrict,
  constraint memories_caption_length check (caption is null or char_length(caption) <= 2000),
  constraint memories_location_length check (location_label is null or char_length(location_label) <= 240),
  constraint memories_display_order_nonnegative check (display_order >= 0),
  constraint memories_mime_type_valid check (original_mime_type in ('image/jpeg', 'image/png')),
  constraint memories_declared_size_valid check (declared_size_bytes between 1 and 15728640),
  constraint memories_thumbnail_size_valid check (declared_thumbnail_size_bytes between 1 and 524288),
  constraint memories_stored_size_valid check (stored_size_bytes is null or stored_size_bytes between 1 and 15728640),
  constraint memories_stored_thumbnail_size_valid check (stored_thumbnail_size_bytes is null or stored_thumbnail_size_bytes between 1 and 524288),
  constraint memories_dimensions_valid check (
    (width is null and height is null)
    or (width between 1 and 20000 and height between 1 and 20000)
  ),
  constraint memories_upload_status_valid check (upload_status in ('pending', 'ready', 'failed'))
);

create table public.travel_companions (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  display_name text not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint travel_companions_id_user_unique unique (id, user_id),
  constraint travel_companions_display_name_length check (char_length(display_name) between 1 and 120),
  constraint travel_companions_notes_length check (notes is null or char_length(notes) <= 2000)
);

create table public.trip_companions (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  trip_id uuid not null,
  companion_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (trip_id, companion_id),
  constraint trip_companions_trip_owner_fkey foreign key (trip_id, user_id)
    references public.trips(id, user_id) on delete cascade,
  constraint trip_companions_companion_owner_fkey foreign key (companion_id, user_id)
    references public.travel_companions(id, user_id) on delete cascade
);

create table public.places (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  trip_id uuid not null,
  name text not null,
  city text,
  country_code text not null,
  latitude numeric(9,6),
  longitude numeric(9,6),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint places_trip_owner_country_fkey foreign key (trip_id, user_id, country_code)
    references public.trips(id, user_id, country_code) on delete cascade,
  constraint places_name_length check (char_length(name) between 1 and 180),
  constraint places_city_length check (city is null or char_length(city) <= 160),
  constraint places_latitude_valid check (latitude is null or latitude between -90 and 90),
  constraint places_longitude_valid check (longitude is null or longitude between -180 and 180),
  constraint places_coordinates_paired check ((latitude is null) = (longitude is null)),
  constraint places_notes_length check (notes is null or char_length(notes) <= 5000)
);

create table public.bucket_list (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  country_code text not null references public.countries(iso_code),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bucket_list_user_country_unique unique (user_id, country_code),
  constraint bucket_list_notes_length check (notes is null or char_length(notes) <= 2000)
);

create index trips_user_start_cursor_idx on public.trips (user_id, start_date desc, id desc);
create index trips_user_country_start_idx on public.trips (user_id, country_code, start_date desc);
create index trips_user_favourites_idx on public.trips (user_id, start_date desc) where is_favourite;
create index memories_user_taken_cursor_idx on public.memories (user_id, taken_at desc nulls last, id desc);
create index memories_trip_gallery_idx on public.memories (trip_id, display_order, id);
create index memories_user_favourites_idx on public.memories (user_id, taken_at desc) where is_favourite and upload_status = 'ready';
create index memories_pending_idx on public.memories (created_at) where upload_status = 'pending';
create index travel_companions_user_name_idx on public.travel_companions (user_id, display_name);
create index trip_companions_user_idx on public.trip_companions (user_id);
create index trip_companions_companion_idx on public.trip_companions (companion_id);
create index places_user_trip_idx on public.places (user_id, trip_id);
create index places_country_idx on public.places (country_code);
create index bucket_list_country_idx on public.bucket_list (country_code);

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function private.set_updated_at() from public, anon, authenticated;

create or replace function private.create_user_defaults()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id);
  insert into public.user_preferences (user_id) values (new.id);
  return new;
end;
$$;

revoke all on function private.create_user_defaults() from public, anon, authenticated, service_role;

create or replace function private.prepare_memory_paths()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  original_extension text;
begin
  if tg_op = 'INSERT' then
    original_extension := case new.original_mime_type when 'image/png' then 'png' else 'jpg' end;
    new.upload_status := 'pending';
    new.stored_size_bytes := null;
    new.stored_thumbnail_size_bytes := null;
    new.original_path := new.user_id::text || '/' || new.trip_id::text || '/' || new.id::text || '/' || extensions.gen_random_uuid()::text || '.' || original_extension;
    new.thumbnail_path := new.user_id::text || '/' || new.trip_id::text || '/' || new.id::text || '/thumbnail-' || extensions.gen_random_uuid()::text || '.jpg';
    return new;
  end if;

  if new.id is distinct from old.id
    or new.user_id is distinct from old.user_id
    or new.trip_id is distinct from old.trip_id
    or new.original_path is distinct from old.original_path
    or new.thumbnail_path is distinct from old.thumbnail_path
    or new.original_mime_type is distinct from old.original_mime_type then
    raise exception using errcode = '22023', message = 'memory ownership and storage identity are immutable';
  end if;

  if current_user not in ('postgres', 'service_role') and (
    new.upload_status is distinct from old.upload_status
    or new.stored_size_bytes is distinct from old.stored_size_bytes
    or new.stored_thumbnail_size_bytes is distinct from old.stored_thumbnail_size_bytes
  ) then
    raise exception using errcode = '42501', message = 'upload state is server managed';
  end if;

  return new;
end;
$$;

revoke all on function private.prepare_memory_paths() from public, anon, authenticated;

create trigger auth_user_created_defaults
after insert on auth.users
for each row execute function private.create_user_defaults();

create trigger memories_prepare_paths
before insert or update on public.memories
for each row execute function private.prepare_memory_paths();

create trigger countries_updated_at before update on public.countries for each row execute function private.set_updated_at();
create trigger profiles_updated_at before update on public.profiles for each row execute function private.set_updated_at();
create trigger user_preferences_updated_at before update on public.user_preferences for each row execute function private.set_updated_at();
create trigger trips_updated_at before update on public.trips for each row execute function private.set_updated_at();
create trigger memories_updated_at before update on public.memories for each row execute function private.set_updated_at();
create trigger travel_companions_updated_at before update on public.travel_companions for each row execute function private.set_updated_at();
create trigger places_updated_at before update on public.places for each row execute function private.set_updated_at();
create trigger bucket_list_updated_at before update on public.bucket_list for each row execute function private.set_updated_at();

alter table public.countries enable row level security;
alter table public.profiles enable row level security;
alter table public.user_preferences enable row level security;
alter table public.trips enable row level security;
alter table public.memories enable row level security;
alter table public.travel_companions enable row level security;
alter table public.trip_companions enable row level security;
alter table public.places enable row level security;
alter table public.bucket_list enable row level security;

create policy countries_read_active on public.countries for select to anon, authenticated using (is_active);

create policy profiles_select_own on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy profiles_update_own on public.profiles for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy user_preferences_select_own on public.user_preferences for select to authenticated using ((select auth.uid()) = user_id);
create policy user_preferences_update_own on public.user_preferences for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy trips_select_own on public.trips for select to authenticated using ((select auth.uid()) = user_id);
create policy trips_insert_own on public.trips for insert to authenticated with check ((select auth.uid()) = user_id);
create policy trips_update_own on public.trips for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy trips_delete_own_empty on public.trips for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy memories_select_own on public.memories for select to authenticated using ((select auth.uid()) = user_id);
create policy memories_insert_own on public.memories for insert to authenticated with check ((select auth.uid()) = user_id);
create policy memories_update_own on public.memories for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy travel_companions_select_own on public.travel_companions for select to authenticated using ((select auth.uid()) = user_id);
create policy travel_companions_insert_own on public.travel_companions for insert to authenticated with check ((select auth.uid()) = user_id);
create policy travel_companions_update_own on public.travel_companions for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy travel_companions_delete_own on public.travel_companions for delete to authenticated using ((select auth.uid()) = user_id);

create policy trip_companions_select_own on public.trip_companions for select to authenticated using ((select auth.uid()) = user_id);
create policy trip_companions_insert_own on public.trip_companions for insert to authenticated with check ((select auth.uid()) = user_id);
create policy trip_companions_delete_own on public.trip_companions for delete to authenticated using ((select auth.uid()) = user_id);

create policy places_select_own on public.places for select to authenticated using ((select auth.uid()) = user_id);
create policy places_insert_own on public.places for insert to authenticated with check ((select auth.uid()) = user_id);
create policy places_update_own on public.places for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy places_delete_own on public.places for delete to authenticated using ((select auth.uid()) = user_id);

create policy bucket_list_select_own on public.bucket_list for select to authenticated using ((select auth.uid()) = user_id);
create policy bucket_list_insert_own on public.bucket_list for insert to authenticated with check ((select auth.uid()) = user_id);
create policy bucket_list_update_own on public.bucket_list for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy bucket_list_delete_own on public.bucket_list for delete to authenticated using ((select auth.uid()) = user_id);

create or replace view public.personal_statistics
with (security_invoker = true)
as
with trip_stats as (
  select
    t.user_id,
    count(*)::bigint as total_trips,
    count(distinct t.country_code)::bigint as countries_visited,
    count(distinct c.continent_code)::bigint as continents_visited,
    coalesce(sum((t.end_date - t.start_date) + 1), 0)::bigint as total_travel_days,
    min(t.start_date) as first_trip_date,
    max(t.end_date) as latest_trip_date
  from public.trips t
  join public.countries c on c.iso_code = t.country_code
  group by t.user_id
), memory_stats as (
  select user_id, count(*)::bigint as total_memories
  from public.memories
  where upload_status = 'ready'
  group by user_id
)
select
  p.id as user_id,
  coalesce(t.total_trips, 0)::bigint as total_trips,
  coalesce(t.countries_visited, 0)::bigint as countries_visited,
  coalesce(t.continents_visited, 0)::bigint as continents_visited,
  coalesce(m.total_memories, 0)::bigint as total_memories,
  coalesce(t.total_travel_days, 0)::bigint as total_travel_days,
  t.first_trip_date,
  t.latest_trip_date
from public.profiles p
left join trip_stats t on t.user_id = p.id
left join memory_stats m on m.user_id = p.id;

revoke all on all tables in schema public from anon, authenticated;
grant select on public.countries to anon, authenticated;
grant select, update on public.profiles to authenticated;
grant select, update on public.user_preferences to authenticated;
grant select, insert, update, delete on public.trips to authenticated;
grant select, insert, update on public.memories to authenticated;
grant select, insert, update, delete on public.travel_companions to authenticated;
grant select, insert, delete on public.trip_companions to authenticated;
grant select, insert, update, delete on public.places to authenticated;
grant select, insert, update, delete on public.bucket_list to authenticated;
grant select on public.personal_statistics to authenticated;

grant all on all tables in schema public to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('travel-memories', 'travel-memories', false, 15728640, array['image/jpeg', 'image/png']),
  ('travel-thumbnails', 'travel-thumbnails', false, 524288, array['image/jpeg'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy storage_insert_registered_memory
on storage.objects for insert to authenticated
with check (
  bucket_id in ('travel-memories', 'travel-thumbnails')
  and exists (
    select 1
    from public.memories m
    where m.user_id = (select auth.uid())
      and m.upload_status = 'pending'
      and (
        (bucket_id = 'travel-memories' and name = m.original_path)
        or (bucket_id = 'travel-thumbnails' and name = m.thumbnail_path)
      )
  )
);

create policy storage_select_registered_memory
on storage.objects for select to authenticated
using (
  bucket_id in ('travel-memories', 'travel-thumbnails')
  and exists (
    select 1
    from public.memories m
    where m.user_id = (select auth.uid())
      and (
        (bucket_id = 'travel-memories' and name = m.original_path)
        or (bucket_id = 'travel-thumbnails' and name = m.thumbnail_path)
      )
  )
);

comment on view public.personal_statistics is 'RLS-aware personal travel statistics; always query as the authenticated user.';
comment on table public.memories is 'Stores private memory metadata and expected object paths, never signed URLs.';
