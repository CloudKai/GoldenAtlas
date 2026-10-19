-- Durable state for private metadata exports and retryable account deletion.
-- Export objects are intentionally reachable only through trusted Edge Functions.

create table public.data_export_jobs (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  status text not null default 'requested',
  format text not null default 'json',
  requested_at timestamptz not null default now(),
  completed_at timestamptz,
  expires_at timestamptz,
  storage_path text,
  error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint data_export_jobs_status_valid check (
    status in ('requested', 'processing', 'completed', 'failed', 'expired', 'cancelled')
  ),
  constraint data_export_jobs_format_valid check (format = 'json'),
  constraint data_export_jobs_path_safe check (
    storage_path is null or (
      storage_path like user_id::text || '/' || id::text || '/%.json'
      and storage_path !~ '(^|/)\.\.(/|$)'
      and storage_path !~ '[[:cntrl:]]'
      and char_length(storage_path) <= 500
    )
  ),
  constraint data_export_jobs_error_code_safe check (
    error_code is null or error_code ~ '^[A-Z][A-Z0-9_]{2,63}$'
  ),
  constraint data_export_jobs_completion_consistent check (
    (status = 'completed' and completed_at is not null and expires_at > completed_at and storage_path is not null and error_code is null)
    or (status <> 'completed')
  )
);

create table public.account_deletion_requests (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  status text not null default 'requested',
  requested_at timestamptz not null default now(),
  completed_at timestamptz,
  failure_code text,
  retry_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint account_deletion_requests_status_valid check (
    status in ('requested', 'processing', 'failed')
  ),
  constraint account_deletion_requests_failure_code_safe check (
    failure_code is null or failure_code ~ '^[A-Z][A-Z0-9_]{2,63}$'
  ),
  constraint account_deletion_requests_retry_nonnegative check (retry_count >= 0),
  constraint account_deletion_requests_completion_unused check (completed_at is null)
);

create unique index data_export_jobs_one_active_idx
  on public.data_export_jobs (user_id)
  where status in ('requested', 'processing');
create index data_export_jobs_user_requested_idx
  on public.data_export_jobs (user_id, requested_at desc, id desc);
create index data_export_jobs_expiry_idx
  on public.data_export_jobs (expires_at, id)
  where status = 'completed';
create index account_deletion_requests_status_idx
  on public.account_deletion_requests (status, requested_at, id);

create trigger data_export_jobs_updated_at
before update on public.data_export_jobs
for each row execute function private.set_updated_at();

create trigger account_deletion_requests_updated_at
before update on public.account_deletion_requests
for each row execute function private.set_updated_at();

alter table public.data_export_jobs enable row level security;
alter table public.account_deletion_requests enable row level security;

create policy data_export_jobs_select_own
on public.data_export_jobs for select to authenticated
using ((select auth.uid()) = user_id);

create policy account_deletion_requests_select_own
on public.account_deletion_requests for select to authenticated
using ((select auth.uid()) = user_id);

revoke all on public.data_export_jobs from anon, authenticated;
revoke all on public.account_deletion_requests from anon, authenticated;
grant select on public.data_export_jobs to authenticated;
grant select on public.account_deletion_requests to authenticated;
grant all on public.data_export_jobs to service_role;
grant all on public.account_deletion_requests to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('user-exports', 'user-exports', false, 10485760, array['application/json'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- A deletion request immediately closes the memory-ingest path. The function is
-- invoker security; authenticated callers can see only their own request through RLS.
create or replace function private.prepare_memory_paths()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  original_extension text;
begin
  if tg_op = 'INSERT' then
    if exists (
      select 1
      from public.account_deletion_requests request
      where request.user_id = new.user_id
        and request.status in ('requested', 'processing', 'failed')
    ) then
      raise exception using errcode = '55000', message = 'account deletion is in progress';
    end if;

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

comment on table public.data_export_jobs is
  'Private JSON export lifecycle. Object paths are signed only by trusted Edge Functions.';
comment on table public.account_deletion_requests is
  'Minimum retry state retained only while an authentication account still exists.';
