-- Vydrivo request safety: idempotency keys and durable rate limits.
-- Run this in the Supabase SQL editor. Until it is applied, the API falls back
-- to its in-memory dedupe and generation still works.

create table if not exists public.request_idempotency (
  key text primary key,
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  scope text not null check (char_length(scope) between 1 and 120),
  request_hash text not null check (char_length(request_hash) between 16 and 128),
  status text not null default 'in_progress' check (status in ('in_progress', 'completed', 'failed')),
  response_status integer,
  response_body jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '24 hours'
);

create index if not exists request_idempotency_expires_idx
  on public.request_idempotency (expires_at);

alter table public.request_idempotency enable row level security;

drop policy if exists "request_idempotency_select_own" on public.request_idempotency;
create policy "request_idempotency_select_own"
on public.request_idempotency for select
to authenticated
using (owner_id = (select auth.uid()));

drop policy if exists "request_idempotency_insert_own" on public.request_idempotency;
create policy "request_idempotency_insert_own"
on public.request_idempotency for insert
to authenticated
with check (owner_id = (select auth.uid()));

drop policy if exists "request_idempotency_update_own" on public.request_idempotency;
create policy "request_idempotency_update_own"
on public.request_idempotency for update
to authenticated
using (owner_id = (select auth.uid()))
with check (owner_id = (select auth.uid()));

drop policy if exists "request_idempotency_delete_own" on public.request_idempotency;
create policy "request_idempotency_delete_own"
on public.request_idempotency for delete
to authenticated
using (owner_id = (select auth.uid()));

drop trigger if exists request_idempotency_touch_updated_at on public.request_idempotency;
create trigger request_idempotency_touch_updated_at
before update on public.request_idempotency
for each row execute function public.touch_projects_updated_at();

revoke all on public.request_idempotency from anon;
grant select, insert, update, delete on public.request_idempotency to authenticated;

create table if not exists public.request_rate_limits (
  owner_id uuid not null references auth.users(id) on delete cascade,
  bucket text not null check (char_length(bucket) between 1 and 80),
  window_start timestamptz not null,
  count integer not null default 0 check (count >= 0),
  primary key (owner_id, bucket, window_start)
);

alter table public.request_rate_limits enable row level security;

drop policy if exists "request_rate_limits_select_own" on public.request_rate_limits;
create policy "request_rate_limits_select_own"
on public.request_rate_limits for select
to authenticated
using (owner_id = (select auth.uid()));

drop policy if exists "request_rate_limits_insert_own" on public.request_rate_limits;
create policy "request_rate_limits_insert_own"
on public.request_rate_limits for insert
to authenticated
with check (owner_id = (select auth.uid()));

drop policy if exists "request_rate_limits_update_own" on public.request_rate_limits;
create policy "request_rate_limits_update_own"
on public.request_rate_limits for update
to authenticated
using (owner_id = (select auth.uid()))
with check (owner_id = (select auth.uid()));

revoke all on public.request_rate_limits from anon;
grant select, insert, update on public.request_rate_limits to authenticated;

create or replace function public.consume_request_rate_limit(
  p_bucket text,
  p_limit integer,
  p_window_seconds integer
) returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_owner uuid := auth.uid();
  v_window timestamptz;
  v_count integer;
begin
  if v_owner is null then
    raise exception 'AUTH_REQUIRED';
  end if;
  if p_limit < 1 or p_window_seconds < 1 then
    raise exception 'Invalid rate limit';
  end if;
  v_window := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  insert into public.request_rate_limits (owner_id, bucket, window_start, count)
  values (v_owner, p_bucket, v_window, 1)
  on conflict (owner_id, bucket, window_start)
  do update set count = public.request_rate_limits.count + 1
  returning count into v_count;
  return jsonb_build_object(
    'allowed', v_count <= p_limit,
    'count', v_count,
    'limit', p_limit,
    'remaining', greatest(p_limit - v_count, 0),
    'resetAt', v_window + make_interval(secs => p_window_seconds)
  );
end;
$$;

revoke all on function public.consume_request_rate_limit(text, integer, integer) from public;
grant execute on function public.consume_request_rate_limit(text, integer, integer) to authenticated;
