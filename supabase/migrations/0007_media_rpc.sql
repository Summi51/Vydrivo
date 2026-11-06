-- Vydrivo media RPCs: keep validation and quota server-controlled.
-- Run this in the Supabase SQL editor after 0006_media_probe.sql.
-- After this migration, authenticated clients can SELECT their own media rows
-- but cannot INSERT/UPDATE/DELETE them directly. The API calls the
-- security-definer functions below with the user's access token.

-- The reserve function must be security definer because direct INSERT is revoked.
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
security definer
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

create or replace function public.finalize_media_asset(
  p_asset_id uuid,
  p_bytes bigint,
  p_mime text,
  p_object_key text,
  p_native_properties jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid := auth.uid();
  v_row public.media_assets;
  v_project uuid;
  v_kind text;
  v_declared bigint;
  v_mime text;
  v_prefix text;
begin
  if v_owner is null then
    raise exception 'AUTH_REQUIRED';
  end if;
  if p_bytes is null or p_bytes < 1 or p_bytes > 104857600 then
    raise exception 'INVALID_MEDIA_SIZE';
  end if;
  if p_mime is null or p_mime not in ('video/mp4', 'video/webm', 'image/jpeg', 'image/png') then
    raise exception 'INVALID_MEDIA_TYPE';
  end if;
  if p_native_properties is null or jsonb_typeof(p_native_properties) <> 'object' then
    raise exception 'INVALID_MEDIA_PROPERTIES';
  end if;

  select project_id, kind, declared_bytes, mime
  into v_project, v_kind, v_declared, v_mime
  from public.media_assets
  where id = p_asset_id and owner_id = v_owner;

  if v_project is null then
    return null;
  end if;
  if p_bytes <> v_declared then
    raise exception 'INVALID_MEDIA_SIZE';
  end if;
  if p_mime <> v_mime then
    raise exception 'INVALID_MEDIA_TYPE';
  end if;

  v_prefix := 'users/' || v_owner::text || '/projects/' || v_project::text || '/' || v_kind || '/';
  if p_object_key is null or p_object_key not like v_prefix || '%' then
    raise exception 'INVALID_MEDIA_KEY';
  end if;

  update public.media_assets
  set status = 'validated',
      bytes = p_bytes,
      mime = p_mime,
      object_key = p_object_key,
      native_properties = p_native_properties,
      probe_error = null,
      rejected_reason = null,
      validated_at = now()
  where id = p_asset_id
    and owner_id = v_owner
    and status = 'pending'
    and expires_at > now()
  returning * into v_row;

  return case when v_row.id is null then null else to_jsonb(v_row) end;
end;
$$;

revoke all on function public.finalize_media_asset(uuid, bigint, text, text, jsonb) from public;
grant execute on function public.finalize_media_asset(uuid, bigint, text, text, jsonb) to authenticated;

create or replace function public.reject_media_asset(
  p_asset_id uuid,
  p_reason text default '',
  p_probe_error text default ''
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid := auth.uid();
  v_row public.media_assets;
begin
  if v_owner is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  update public.media_assets
  set status = 'rejected',
      rejected_reason = left(coalesce(p_reason, ''), 500),
      probe_error = nullif(left(coalesce(p_probe_error, ''), 500), ''),
      deleted_at = now()
  where id = p_asset_id
    and owner_id = v_owner
    and status = 'pending'
  returning * into v_row;

  return case when v_row.id is null then null else to_jsonb(v_row) end;
end;
$$;

revoke all on function public.reject_media_asset(uuid, text, text) from public;
grant execute on function public.reject_media_asset(uuid, text, text) to authenticated;

create or replace function public.delete_media_asset(p_asset_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid := auth.uid();
  v_row public.media_assets;
begin
  if v_owner is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  update public.media_assets
  set status = 'deleted',
      deleted_at = now()
  where id = p_asset_id
    and owner_id = v_owner
    and status in ('pending', 'validated')
  returning * into v_row;

  return case when v_row.id is null then null else to_jsonb(v_row) end;
end;
$$;

revoke all on function public.delete_media_asset(uuid) from public;
grant execute on function public.delete_media_asset(uuid) to authenticated;

-- Direct table writes are no longer available to the authenticated role.
-- SELECT remains owner-scoped through the existing RLS policy.
revoke insert, update, delete on public.media_assets from authenticated;

comment on function public.reserve_media_asset(uuid, text, text, text, bigint, bigint, text) is
  'Owner-checked quota reservation and pending media row; security definer because direct insert is revoked.';
comment on function public.finalize_media_asset(uuid, bigint, text, text, jsonb) is
  'Owner-checked pending -> validated transition for an API-probed committed object.';
comment on function public.reject_media_asset(uuid, text, text) is
  'Owner-checked pending -> rejected transition with bounded probe error.';
comment on function public.delete_media_asset(uuid) is
  'Owner-checked pending/validated -> deleted transition.';
