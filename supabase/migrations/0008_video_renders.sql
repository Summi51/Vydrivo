-- Vydrivo durable video renders and editable scene scripts.
-- Run this in the Supabase SQL editor for the project used by the app.
-- Object bytes live in the private S3-compatible bucket; these tables store
-- owner-scoped metadata and object keys only. The browser never receives the
-- service role or storage credentials.

create extension if not exists pgcrypto;

create table if not exists public.video_renders (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  run_id uuid not null,
  title text not null check (char_length(title) between 1 and 160),
  language text not null check (language in ('hindi', 'english')),
  voice text not null check (voice in ('male', 'female')),
  status text not null default 'ready' check (status in ('uploading', 'ready', 'failed')),
  seconds numeric(7, 1) not null check (seconds > 0),
  width integer not null check (width between 1 and 8192),
  height integer not null check (height between 1 and 8192),
  video_key text not null check (char_length(video_key) between 32 and 512),
  thumbnail_key text check (thumbnail_key is null or char_length(thumbnail_key) between 32 and 512),
  script_key text check (script_key is null or char_length(script_key) between 32 and 512),
  metadata_key text check (metadata_key is null or char_length(metadata_key) between 32 and 512),
  bytes bigint not null check (bytes > 0),
  thumbnail_bytes bigint check (thumbnail_bytes is null or thumbnail_bytes > 0),
  script_bytes bigint check (script_bytes is null or script_bytes > 0),
  metadata jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, run_id)
);

comment on table public.video_renders is 'Owner-scoped durable metadata for completed graphics renders. MP4, thumbnail and render-script bytes live in private storage, never in the public sample bucket.';

create index if not exists video_renders_owner_created_idx
  on public.video_renders (owner_id, created_at desc);

create index if not exists video_renders_project_created_idx
  on public.video_renders (project_id, created_at desc);

create or replace function public.touch_video_renders_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists video_renders_touch_updated_at on public.video_renders;
create trigger video_renders_touch_updated_at
before update on public.video_renders
for each row execute function public.touch_video_renders_updated_at();

alter table public.video_renders enable row level security;

drop policy if exists "video_renders_select_own" on public.video_renders;
create policy "video_renders_select_own"
on public.video_renders for select
to authenticated
using (owner_id = (select auth.uid()));

drop policy if exists "video_renders_insert_own" on public.video_renders;
create policy "video_renders_insert_own"
on public.video_renders for insert
to authenticated
with check (
  owner_id = (select auth.uid())
  and exists (
    select 1 from public.projects p
    where p.id = project_id and p.owner_id = (select auth.uid())
  )
);

drop policy if exists "video_renders_update_own" on public.video_renders;
create policy "video_renders_update_own"
on public.video_renders for update
to authenticated
using (owner_id = (select auth.uid()))
with check (
  owner_id = (select auth.uid())
  and exists (
    select 1 from public.projects p
    where p.id = project_id and p.owner_id = (select auth.uid())
  )
);

drop policy if exists "video_renders_delete_own" on public.video_renders;
create policy "video_renders_delete_own"
on public.video_renders for delete
to authenticated
using (owner_id = (select auth.uid()));

revoke all on public.video_renders from anon;
grant select, insert, update, delete on public.video_renders to authenticated;

-- Editable scene text is the source for the next render, so it is stored
-- separately from an individual render's exact script copy.
create table if not exists public.project_graphics_scripts (
  project_id uuid primary key references public.projects(id) on delete cascade,
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  script jsonb not null check (jsonb_typeof(script) = 'object' and pg_column_size(script) <= 524288),
  updated_at timestamptz not null default now()
);

comment on table public.project_graphics_scripts is 'Owner-scoped editable Hinglish/Hindi scene text for a project. The exact per-render copy is stored with the render metadata.';

create or replace function public.touch_project_graphics_scripts_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists project_graphics_scripts_touch_updated_at on public.project_graphics_scripts;
create trigger project_graphics_scripts_touch_updated_at
before update on public.project_graphics_scripts
for each row execute function public.touch_project_graphics_scripts_updated_at();

alter table public.project_graphics_scripts enable row level security;

drop policy if exists "project_graphics_scripts_select_own" on public.project_graphics_scripts;
create policy "project_graphics_scripts_select_own"
on public.project_graphics_scripts for select
to authenticated
using (owner_id = (select auth.uid()));

drop policy if exists "project_graphics_scripts_insert_own" on public.project_graphics_scripts;
create policy "project_graphics_scripts_insert_own"
on public.project_graphics_scripts for insert
to authenticated
with check (
  owner_id = (select auth.uid())
  and exists (
    select 1 from public.projects p
    where p.id = project_id and p.owner_id = (select auth.uid())
  )
);

drop policy if exists "project_graphics_scripts_update_own" on public.project_graphics_scripts;
create policy "project_graphics_scripts_update_own"
on public.project_graphics_scripts for update
to authenticated
using (owner_id = (select auth.uid()))
with check (
  owner_id = (select auth.uid())
  and exists (
    select 1 from public.projects p
    where p.id = project_id and p.owner_id = (select auth.uid())
  )
);

drop policy if exists "project_graphics_scripts_delete_own" on public.project_graphics_scripts;
create policy "project_graphics_scripts_delete_own"
on public.project_graphics_scripts for delete
to authenticated
using (owner_id = (select auth.uid()));

revoke all on public.project_graphics_scripts from anon;
grant select, insert, update, delete on public.project_graphics_scripts to authenticated;
