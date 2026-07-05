-- 0003_roles: roles + the user<->role join table.
-- 0004_permissions.sql drops and replaces user_roles_select_own with a merged
-- "self OR has_permission(...)" policy, and adds the manager write policies for both
-- tables, once has_permission() exists.

create table public.roles (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  is_system boolean not null default false, -- system roles can't be deleted from the UI
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id),
  updated_by uuid references public.profiles (id),
  deleted_at timestamptz,
  deleted_by uuid references public.profiles (id)
);

comment on table public.roles is 'RBAC roles, e.g. Super Admin, Admin, Manager, Employee.';

create index roles_created_by_idx on public.roles (created_by);
create index roles_updated_by_idx on public.roles (updated_by);
create index roles_deleted_by_idx on public.roles (deleted_by);

create trigger set_roles_updated_at
  before update on public.roles
  for each row
  execute function public.set_updated_at();

create table public.user_roles (
  user_id uuid not null references public.profiles (id) on delete cascade,
  role_id uuid not null references public.roles (id) on delete cascade,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles (id),
  primary key (user_id, role_id)
);

comment on table public.user_roles is 'A user can hold multiple roles simultaneously.';

create index user_roles_role_id_idx on public.user_roles (role_id);
create index user_roles_created_by_idx on public.user_roles (created_by);

alter table public.roles enable row level security;
alter table public.user_roles enable row level security;

create policy "user_roles_select_own"
  on public.user_roles for select
  to authenticated
  using (user_id = (select auth.uid()));
