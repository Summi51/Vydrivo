-- Vydrivo Instagram connection (Meta Instagram API with Unified Login).
-- Run this in the Supabase SQL editor for the project used by the app.
-- Access tokens are encrypted by the server before they reach this table and
-- are never returned to the browser. Browser requests only read a username and
-- connection timestamp through the owner-scoped API.

create extension if not exists pgcrypto;

create table if not exists public.instagram_oauth_states (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  state_hash text not null unique check (state_hash ~ '^[0-9a-f]{64}$'),
  return_origin text not null check (char_length(return_origin) between 1 and 200),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  consumed_at timestamptz
);

comment on table public.instagram_oauth_states is 'Single-use Instagram OAuth states. The browser receives the raw state; only its SHA-256 hash is stored. The callback consumes a state through a security-definer RPC so it works across the localhost and deployed origins.';

create index if not exists instagram_oauth_states_expires_idx
  on public.instagram_oauth_states (expires_at);

alter table public.instagram_oauth_states enable row level security;

drop policy if exists "instagram_oauth_states_insert_own" on public.instagram_oauth_states;
create policy "instagram_oauth_states_insert_own"
on public.instagram_oauth_states for insert
to authenticated
with check (
  owner_id = (select auth.uid())
  and expires_at > now()
  and expires_at <= now() + interval '20 minutes'
);

revoke all on public.instagram_oauth_states from anon;
revoke all on public.instagram_oauth_states from authenticated;
grant insert on public.instagram_oauth_states to authenticated;

create table if not exists public.instagram_connections (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  ig_user_id text not null check (char_length(ig_user_id) between 1 and 64),
  username text not null check (char_length(username) between 1 and 64),
  business_id text check (business_id is null or char_length(business_id) between 1 and 64),
  config_id text not null check (char_length(config_id) between 1 and 64),
  token_ciphertext text not null check (char_length(token_ciphertext) between 1 and 8192),
  token_iv text not null check (char_length(token_iv) between 1 and 64),
  token_tag text not null check (char_length(token_tag) between 1 and 64),
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.instagram_connections is 'Owner-scoped Instagram professional account connection. The access token is AES-256-GCM encrypted server-side; this table never stores plaintext tokens.';

alter table public.instagram_connections enable row level security;

drop policy if exists "instagram_connections_select_own" on public.instagram_connections;
create policy "instagram_connections_select_own"
on public.instagram_connections for select
to authenticated
using (owner_id = (select auth.uid()));

drop policy if exists "instagram_connections_delete_own" on public.instagram_connections;
create policy "instagram_connections_delete_own"
on public.instagram_connections for delete
to authenticated
using (owner_id = (select auth.uid()));

revoke all on public.instagram_connections from anon;
revoke all on public.instagram_connections from authenticated;
grant select, delete on public.instagram_connections to authenticated;

-- Returns the origin the browser should return to, or null when the state is
-- unknown, expired, or already consumed. It does not consume the state so the
-- callback can exchange the code before committing the connection.
create or replace function public.peek_instagram_oauth_state(p_state_hash text)
returns text
language sql
security definer
set search_path = public
as $$
  select return_origin
  from public.instagram_oauth_states
  where state_hash = p_state_hash
    and consumed_at is null
    and expires_at > now()
  limit 1;
$$;

-- Consumes a state and saves the encrypted connection in one transaction. The
-- raw state is a 256-bit capability; only its hash is stored. A second call
-- with the same state returns false, so a captured callback URL cannot be
-- replayed to overwrite a connection.
create or replace function public.complete_instagram_connection(
  p_state_hash text,
  p_ig_user_id text,
  p_username text,
  p_business_id text,
  p_config_id text,
  p_token_ciphertext text,
  p_token_iv text,
  p_token_tag text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
begin
  update public.instagram_oauth_states
     set consumed_at = now()
   where state_hash = p_state_hash
     and consumed_at is null
     and expires_at > now()
  returning owner_id into v_owner;

  if v_owner is null then
    return false;
  end if;

  insert into public.instagram_connections (
    owner_id,
    ig_user_id,
    username,
    business_id,
    config_id,
    token_ciphertext,
    token_iv,
    token_tag,
    connected_at,
    updated_at
  ) values (
    v_owner,
    p_ig_user_id,
    p_username,
    p_business_id,
    p_config_id,
    p_token_ciphertext,
    p_token_iv,
    p_token_tag,
    now(),
    now()
  )
  on conflict (owner_id) do update set
    ig_user_id = excluded.ig_user_id,
    username = excluded.username,
    business_id = excluded.business_id,
    config_id = excluded.config_id,
    token_ciphertext = excluded.token_ciphertext,
    token_iv = excluded.token_iv,
    token_tag = excluded.token_tag,
    connected_at = now(),
    updated_at = now();

  return true;
end;
$$;

revoke all on function public.peek_instagram_oauth_state(text) from public;
revoke all on function public.complete_instagram_connection(text, text, text, text, text, text, text, text) from public;
grant execute on function public.peek_instagram_oauth_state(text) to anon, authenticated;
grant execute on function public.complete_instagram_connection(text, text, text, text, text, text, text, text) to anon, authenticated;

-- Housekeeping helper: delete expired or consumed states. The API does not
-- depend on it, so it can be scheduled later without blocking generation.
create or replace function public.purge_instagram_oauth_states()
returns integer
language sql
security definer
set search_path = public
as $$
  with deleted as (
    delete from public.instagram_oauth_states
    where expires_at < now() - interval '1 day'
       or (consumed_at is not null and consumed_at < now() - interval '1 day')
    returning 1
  )
  select count(*)::integer from deleted;
$$;

revoke all on function public.purge_instagram_oauth_states() from public;
grant execute on function public.purge_instagram_oauth_states() to authenticated;
