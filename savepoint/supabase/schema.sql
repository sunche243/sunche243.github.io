begin;
create table public.savepoint_members (
 user_id uuid primary key references auth.users(id) on delete cascade,
 created_at timestamptz not null default now()
);
alter table public.savepoint_members enable row level security;
revoke all on public.savepoint_members from public, anon, authenticated;
grant select on public.savepoint_members to authenticated;
create policy savepoint_members_self on public.savepoint_members for select to authenticated using (user_id = (select auth.uid()));
create table public.savepoint_projects (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references public.savepoint_members(user_id) on delete cascade,
 content jsonb not null check (jsonb_typeof(content) = 'object' and octet_length(content::text) <= 2000000),
 version integer not null default 1,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index savepoint_projects_owner_updated on public.savepoint_projects(owner_id, updated_at desc);
alter table public.savepoint_projects enable row level security;
revoke all on public.savepoint_projects from public, anon, authenticated;
grant select, delete on public.savepoint_projects to authenticated;
grant insert(id, owner_id, content) on public.savepoint_projects to authenticated;
grant update(content) on public.savepoint_projects to authenticated;
create policy savepoint_select on public.savepoint_projects for select to authenticated using (owner_id = (select auth.uid()));
create policy savepoint_insert on public.savepoint_projects for insert to authenticated with check (owner_id = (select auth.uid()));
create policy savepoint_update on public.savepoint_projects for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy savepoint_delete on public.savepoint_projects for delete to authenticated using (owner_id = (select auth.uid()));
create function public.savepoint_touch() returns trigger language plpgsql security invoker set search_path = '' as $$ begin new.updated_at = now(); new.version = old.version + 1; return new; end $$;
revoke all on function public.savepoint_touch() from public, anon, authenticated;
create trigger savepoint_touch before update on public.savepoint_projects for each row execute function public.savepoint_touch();
-- Invite only the owner's existing account. Other event administrators have no membership.
insert into public.savepoint_members(user_id) select id from auth.users where email = 'starcj7@naver.com';
commit;
