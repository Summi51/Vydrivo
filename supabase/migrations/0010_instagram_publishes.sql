-- Vydrivo Instagram publishing jobs (single video, Reels only).
-- Run this in the Supabase SQL editor for the project used by the app.
-- The private MP4 is never stored here: each publish job records the Instagram
-- container/media IDs, caption, status and permalink for one owner render.

create extension if not exists pgcrypto;

create table if not exists public.instagram_publishes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  run_id uuid not null,
  caption text not null default '' check (char_length(caption) <= 2200),
  status text not null default 'processing' check (status in ('processing', 'published', 'failed')),
  container_id text check (container_id is null or char_length(container_id) between 1 and 64),
  media_id text check (media_id is null or char_length(media_id) between 1 and 64),
  permalink text check (permalink is null or char_length(permalink) between 8 and 2048),
  error_code text check (error_code is null or char_length(error_code) between 1 and 64),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, run_id)
);

comment on table public.instagram_publishes is 'Owner-scoped Instagram Reels publish jobs. One row per render; the MP4 stays in private storage and Instagram is given a short-lived signed URL.';

create index if not exists instagram_publishes_owner_created_idx
  on public.instagram_publishes (owner_id, created_at desc);

create or replace function public.touch_instagram_publishes_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists instagram_publishes_touch_updated_at on public.instagram_publishes;
create trigger instagram_publishes_touch_updated_at
before update on public.instagram_publishes
for each row execute function public.touch_instagram_publishes_updated_at();

alter table public.instagram_publishes enable row level security;

drop policy if exists "instagram_publishes_select_own" on public.instagram_publishes;
create policy "instagram_publishes_select_own"
on public.instagram_publishes for select
to authenticated
using (owner_id = (select auth.uid()));

drop policy if exists "instagram_publishes_insert_own" on public.instagram_publishes;
create policy "instagram_publishes_insert_own"
on public.instagram_publishes for insert
to authenticated
with check (
  owner_id = (select auth.uid())
  and exists (
    select 1 from public.projects p
    where p.id = project_id and p.owner_id = (select auth.uid())
  )
);

drop policy if exists "instagram_publishes_update_own" on public.instagram_publishes;
create policy "instagram_publishes_update_own"
on public.instagram_publishes for update
to authenticated
using (owner_id = (select auth.uid()))
with check (
  owner_id = (select auth.uid())
  and exists (
    select 1 from public.projects p
    where p.id = project_id and p.owner_id = (select auth.uid())
  )
);

revoke all on public.instagram_publishes from anon;
grant select, insert, update on public.instagram_publishes to authenticated;
