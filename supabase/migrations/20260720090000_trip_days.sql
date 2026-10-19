-- Per-day titles and diary entries for a trip.
-- A trip's days are implicit (every date from start_date to end_date). A row exists only for a day the user has
-- written something on. Photos belong to a day through memories.taken_at, so no memory column changes are needed.

create table public.trip_days (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  trip_id uuid not null,
  day_date date not null,
  title text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trip_days_trip_owner_fkey foreign key (trip_id, user_id)
    references public.trips(id, user_id) on delete cascade,
  constraint trip_days_trip_date_unique unique (trip_id, day_date),
  constraint trip_days_title_length check (title is null or char_length(title) <= 120),
  constraint trip_days_notes_length check (notes is null or char_length(notes) <= 20000)
);

create index trip_days_user_trip_idx on public.trip_days (user_id, trip_id, day_date);

create trigger trip_days_updated_at
before update on public.trip_days
for each row execute function private.set_updated_at();

alter table public.trip_days enable row level security;

create policy trip_days_select_own on public.trip_days for select to authenticated
  using ((select auth.uid()) = user_id);
create policy trip_days_insert_own on public.trip_days for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy trip_days_update_own on public.trip_days for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy trip_days_delete_own on public.trip_days for delete to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.trip_days from anon, authenticated;
grant select, insert, update, delete on public.trip_days to authenticated;
grant all on public.trip_days to service_role;

comment on table public.trip_days is 'Optional title and diary text for one calendar day of a trip; absent rows mean an empty day.';
