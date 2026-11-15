-- Vydrivo private reference assets: metadata, finalize state and quota.
-- Run this in the Supabase SQL editor. Until it is applied, media upload
-- intents fail closed with MEDIA_LIBRARY_UNAVAILABLE; no object is stored by
-- this app in the public sample bucket.

create table if not exists public.media_assets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  kind text not null check (kind in ('reference', 'thumbnail')),
  status text not null default 'pending' check (status in ('pending', 'validated', 'rejected', 'deleted', 'expired')),
  storage_backend text not null default 's3' check (storage_backend in ('s3', 'r2')),
  object_key text not null unique check (char_length(object_key) between 32 and 512),
  filename text not null default 'reference' check (char_length(filename) between 1 and 120),
  declared_bytes bigint not null check (declared_bytes between 1 and 104857600),
  bytes bigint check (bytes is null or (bytes between 1 and 104857600)),
  mime text not null check (mime in ('video/mp4', 'video/webm', 'image/jpeg', 'image/png')),
  sha256 text check (sha256 is null or sha256 ~ '^[0-9a-f]{64}$'),
  rejected_reason text check (rejected_reason is null or char_length(rejected_reason) <= 500),
  created_at timestamptz not null default now(),
  validated_at timestamptz,
  expires_at timestamptz not null default now() + interval '1 hour',
  deleted_at timestamptz,
  constraint media_assets_validated_fields check (
    status <> 'validated' or (bytes is not null and validated_at is not null)
  )
);

comment on table public.media_assets is 'Owner-scoped private reference and thumbnail metadata. Object bytes live in private storage, never in the public sample bucket.';

create index if not exists media_assets_owner_project_idx
  on public.media_assets (owner_id, project_id, kind, created_at desc);

create index if not exists media_assets_pending_expiry_idx
  on public.media_assets (expires_at)
  where status = 'pending';

alter table public.media_assets enable row level security;

drop policy if exists "media_assets_select_own" on public.media_assets;
create policy "media_assets_select_own"
on public.media_assets for select
to authenticated
using (owner_id = (select auth.uid()));

drop policy if exists "media_assets_insert_own" on public.media_assets;
create policy "media_assets_insert_own"
on public.media_assets for insert
to authenticated
with check (
  owner_id = (select auth.uid())
  and exists (
    select 1 from public.projects p
    where p.id = project_id and p.owner_id = (select auth.uid())
  )
);

drop policy if exists "media_assets_update_own" on public.media_assets;
create policy "media_assets_update_own"
on public.media_assets for update
to authenticated
using (owner_id = (select auth.uid()))
with check (owner_id = (select auth.uid()));

drop policy if exists "media_assets_delete_own" on public.media_assets;
create policy "media_assets_delete_own"
on public.media_assets for delete
to authenticated
using (owner_id = (select auth.uid()));

revoke all on public.media_assets from anon;
grant select, insert, update, delete on public.media_assets to authenticated;

-- Reserve bytes and create the pending asset row under one owner lock. This
-- keeps concurrent upload intents from overshooting the per-owner quota.
create or replace function public.reserve_media_asset(
  p_project_id uuid,
  p_kind text,
  p_object_key text,
  p_mime text,
  p_bytes bigint,
  p_limit bigint,
  p_filename text default 'reference'
) returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_owner uuid := auth.uid();
  v_used bigint;
  v_row public.media_assets;
  v_prefix text;
begin
  if v_owner is null then
    raise exception 'AUTH_REQUIRED';
  end if;
  if p_kind is null or p_kind not in ('reference', 'thumbnail') then
    raise exception 'INVALID_MEDIA_KIND';
  end if;
  if p_mime is null or p_mime not in ('video/mp4', 'video/webm', 'image/jpeg', 'image/png') then
    raise exception 'INVALID_MEDIA_TYPE';
  end if;
  if p_bytes is null or p_bytes < 1 or p_bytes > 104857600 then
    raise exception 'INVALID_MEDIA_SIZE';
  end if;
  if p_limit is null or p_limit < 1 then
    raise exception 'INVALID_MEDIA_QUOTA';
  end if;
  if not exists (
    select 1 from public.projects
    where id = p_project_id and owner_id = v_owner
  ) then
    raise exception 'PROJECT_NOT_FOUND';
  end if;

  v_prefix := 'users/' || v_owner::text || '/projects/' || p_project_id::text || '/' || p_kind || '/';
  if p_object_key is null or p_object_key not like v_prefix || '%' then
    raise exception 'INVALID_MEDIA_KEY';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_owner::text, 0));

  select coalesce(sum(declared_bytes), 0) into v_used
  from public.media_assets
  where owner_id = v_owner
    and (
      status = 'validated'
      or (status = 'pending' and expires_at > now())
    );

  if v_used + p_bytes > p_limit then
    return jsonb_build_object(
      'allowed', false,
      'usedBytes', v_used,
      'limitBytes', p_limit,
      'remainingBytes', greatest(p_limit - v_used, 0)
    );
  end if;

  insert into public.media_assets (
    owner_id, project_id, kind, status, storage_backend, object_key,
    filename, declared_bytes, mime, expires_at
  )
  values (
    v_owner, p_project_id, p_kind, 'pending', 's3', p_object_key,
    left(coalesce(nullif(p_filename, ''), 'reference'), 120), p_bytes, p_mime, now() + interval '1 hour'
  )
  returning * into v_row;

  return jsonb_build_object(
    'allowed', true,
    'asset', to_jsonb(v_row),
    'usedBytes', v_used + p_bytes,
    'limitBytes', p_limit,
    'remainingBytes', greatest(p_limit - v_used - p_bytes, 0)
  );
end;
$$;

revoke all on function public.reserve_media_asset(uuid, text, text, text, bigint, bigint, text) from public;
grant execute on function public.reserve_media_asset(uuid, text, text, text, bigint, bigint, text) to authenticated;

create or replace function public.media_quota_usage(p_limit bigint)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_owner uuid := auth.uid();
  v_used bigint;
begin
  if v_owner is null then
    raise exception 'AUTH_REQUIRED';
  end if;
  if p_limit is null or p_limit < 1 then
    raise exception 'INVALID_MEDIA_QUOTA';
  end if;
  select coalesce(sum(declared_bytes), 0) into v_used
  from public.media_assets
  where owner_id = v_owner
    and (
      status = 'validated'
      or (status = 'pending' and expires_at > now())
    );
  return jsonb_build_object(
    'usedBytes', v_used,
    'limitBytes', p_limit,
    'remainingBytes', greatest(p_limit - v_used, 0)
  );
end;
$$;

revoke all on function public.media_quota_usage(bigint) from public;
grant execute on function public.media_quota_usage(bigint) to authenticated;
