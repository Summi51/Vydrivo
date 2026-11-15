-- Two-account RLS isolation test.
-- Run the whole script in the Supabase SQL editor. It creates two temporary
-- auth users and one project per owner, checks cross-owner access, and rolls
-- everything back. If an assertion fails, run `rollback;` manually.
--
-- This is the release gate for "only one account has exercised RLS".

begin;

create extension if not exists pgcrypto;

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
  (
    '11111111-1111-4111-8111-111111111111',
    'authenticated',
    'authenticated',
    'rls-test-a@example.invalid',
    crypt('rls-test-only', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  ),
  (
    '22222222-2222-4222-8222-222222222222',
    'authenticated',
    'authenticated',
    'rls-test-b@example.invalid',
    crypt('rls-test-only', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  )
on conflict (id) do nothing;

insert into public.projects (id, owner_id, title, topic)
values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', '11111111-1111-4111-8111-111111111111', 'RLS test A', 'Owner A project'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2', '22222222-2222-4222-8222-222222222222', 'RLS test B', 'Owner B project')
on conflict (id) do nothing;

-- Owner A: sees only A's project, cannot update/delete B's, cannot insert for B.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}', true);

do $$
declare
  n integer;
begin
  select count(*) into n from public.projects;
  if n <> 1 then
    raise exception 'Owner A expected 1 project, saw %', n;
  end if;
  if exists (select 1 from public.projects where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2') then
    raise exception 'Owner A can see Owner B project';
  end if;

  with changed as (
    update public.projects set title = 'hacked' where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2' returning 1
  )
  select count(*) into n from changed;
  if n <> 0 then
    raise exception 'Owner A updated Owner B project';
  end if;

  with removed as (
    delete from public.projects where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2' returning 1
  )
  select count(*) into n from removed;
  if n <> 0 then
    raise exception 'Owner A deleted Owner B project';
  end if;
end $$;

do $$
begin
  begin
    insert into public.projects (owner_id, title, topic)
    values ('22222222-2222-4222-8222-222222222222', 'bad insert', 'bad insert');
    raise exception 'Owner A inserted a project for Owner B';
  exception when insufficient_privilege then
    null;
  end;
end $$;

-- Owner B: sees only B's project, cannot update/delete A's.
select set_config('request.jwt.claims', '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}', true);

do $$
declare
  n integer;
begin
  select count(*) into n from public.projects;
  if n <> 1 then
    raise exception 'Owner B expected 1 project, saw %', n;
  end if;
  if exists (select 1 from public.projects where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1') then
    raise exception 'Owner B can see Owner A project';
  end if;

  with changed as (
    update public.projects set title = 'hacked' where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1' returning 1
  )
  select count(*) into n from changed;
  if n <> 0 then
    raise exception 'Owner B updated Owner A project';
  end if;

  with removed as (
    delete from public.projects where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1' returning 1
  )
  select count(*) into n from removed;
  if n <> 0 then
    raise exception 'Owner B deleted Owner A project';
  end if;
end $$;

-- Anonymous role cannot read the projects table.
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);

do $$
begin
  begin
    perform 1 from public.projects limit 1;
    raise exception 'Anon can read projects';
  exception when insufficient_privilege then
    null;
  end;
end $$;

select 'RLS isolation passed' as result;
rollback;
