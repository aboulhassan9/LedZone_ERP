-- 0004_permissions: permission keys, role<->permission grants, and the has_permission()
-- authorization check every RLS policy (and every Server Action) uses from here on.
-- This migration also lays down the "admin can manage everything" RLS policies for the
-- tables created in 0002/0003, now that has_permission() exists to express them.
--
-- Policy design note: each table gets exactly one permissive policy per {role, command}
-- pair (Postgres OR-combines multiple permissive policies for the same pair, which the
-- planner must evaluate separately — avoid that by merging conditions into one policy,
-- and by splitting "manage" access into INSERT/UPDATE/DELETE instead of FOR ALL wherever
-- a SELECT policy already exists elsewhere).

create table public.permissions (
  id uuid primary key default gen_random_uuid(),
  key text not null unique, -- e.g. 'users.manage', 'roles.manage'
  module text not null,      -- e.g. 'users', 'roles', 'audit'
  action text not null,      -- e.g. 'manage', 'view'
  description text,
  created_at timestamptz not null default now()
);

comment on table public.permissions is
  'Granular permission keys. Every module ships its own rows via its own migration — never edited through the UI.';

create table public.role_permissions (
  role_id uuid not null references public.roles (id) on delete cascade,
  permission_id uuid not null references public.permissions (id) on delete cascade,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles (id),
  primary key (role_id, permission_id)
);

comment on table public.role_permissions is 'Grants: which roles carry which permissions.';

create index role_permissions_permission_id_idx on public.role_permissions (permission_id);
create index role_permissions_created_by_idx on public.role_permissions (created_by);

-- Central authorization check. SECURITY DEFINER so it can read role_permissions/permissions
-- regardless of the caller's own RLS visibility into those tables.
create or replace function public.has_permission(p_user_id uuid, p_key text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id and r.deleted_at is null and r.status = 'active'
    join public.role_permissions rp on rp.role_id = r.id
    join public.permissions p on p.id = rp.permission_id
    where ur.user_id = p_user_id
      and p.key = p_key
  );
$$;

comment on function public.has_permission is
  'Central RBAC check: does user p_user_id hold a permission with key p_key via any active role?';

-- Safe for any signed-in user to call directly (it only returns a boolean for their own
-- RBAC check), but must never be reachable by anon.
revoke execute on function public.has_permission(uuid, text) from anon, public;
grant execute on function public.has_permission(uuid, text) to authenticated;

-- Seed core-platform permission keys. Future modules append their own rows in their own migrations.
insert into public.permissions (key, module, action, description) values
  ('users.manage', 'users', 'manage', 'Invite, edit, deactivate users and assign roles'),
  ('roles.manage', 'roles', 'manage', 'Create/edit roles and assign permissions to roles'),
  ('audit.view', 'audit', 'view', 'View the audit log'),
  ('company.manage', 'company', 'manage', 'Edit company profile and locations'),
  ('currency.manage', 'currency', 'manage', 'Manage supported currencies'),
  ('exchange_rates.manage', 'exchange_rates', 'manage', 'Manage manual exchange rates');

alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;

create policy "permissions_select_authenticated"
  on public.permissions for select
  to authenticated
  using (true);

create policy "role_permissions_select_managers"
  on public.role_permissions for select
  to authenticated
  using (public.has_permission((select auth.uid()), 'roles.manage'));

create policy "role_permissions_insert_managers"
  on public.role_permissions for insert
  to authenticated
  with check (public.has_permission((select auth.uid()), 'roles.manage'));

create policy "role_permissions_update_managers"
  on public.role_permissions for update
  to authenticated
  using (public.has_permission((select auth.uid()), 'roles.manage'))
  with check (public.has_permission((select auth.uid()), 'roles.manage'));

create policy "role_permissions_delete_managers"
  on public.role_permissions for delete
  to authenticated
  using (public.has_permission((select auth.uid()), 'roles.manage'));

-- Replace 0002's self-only policies with merged "self OR manager" versions.

drop policy "profiles_select_own" on public.profiles;
drop policy "profiles_update_own" on public.profiles;

create policy "profiles_select_own_or_managers"
  on public.profiles for select
  to authenticated
  using (
    id = (select auth.uid())
    or public.has_permission((select auth.uid()), 'users.manage')
  );

create policy "profiles_update_own_or_managers"
  on public.profiles for update
  to authenticated
  using (
    id = (select auth.uid())
    or public.has_permission((select auth.uid()), 'users.manage')
  )
  with check (
    id = (select auth.uid())
    or public.has_permission((select auth.uid()), 'users.manage')
  );

-- Replace 0003's self-only user_roles SELECT policy with a merged version, and add the
-- roles/user_roles manager policies.

drop policy "user_roles_select_own" on public.user_roles;

create policy "user_roles_select_own_or_managers"
  on public.user_roles for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or public.has_permission((select auth.uid()), 'users.manage')
  );

create policy "user_roles_insert_managers"
  on public.user_roles for insert
  to authenticated
  with check (public.has_permission((select auth.uid()), 'users.manage'));

create policy "user_roles_delete_managers"
  on public.user_roles for delete
  to authenticated
  using (public.has_permission((select auth.uid()), 'users.manage'));

create policy "roles_select_managers"
  on public.roles for select
  to authenticated
  using (public.has_permission((select auth.uid()), 'roles.manage'));

create policy "roles_insert_managers"
  on public.roles for insert
  to authenticated
  with check (public.has_permission((select auth.uid()), 'roles.manage'));

create policy "roles_update_managers"
  on public.roles for update
  to authenticated
  using (public.has_permission((select auth.uid()), 'roles.manage'))
  with check (public.has_permission((select auth.uid()), 'roles.manage'));

create policy "roles_delete_managers"
  on public.roles for delete
  to authenticated
  using (public.has_permission((select auth.uid()), 'roles.manage'));
