-- 0002_auth: profiles table (1:1 extension of auth.users) + auto-provisioning trigger.
-- RLS here is deliberately limited to self-access only — 0004_permissions.sql drops and
-- replaces these two policies with "self OR has_permission(...)" versions once that
-- function exists.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  phone text,
  avatar_url text,
  location_id uuid, -- FK added in 0005_company.sql once `locations` exists
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id),
  updated_by uuid references public.profiles (id),
  deleted_at timestamptz,
  deleted_by uuid references public.profiles (id)
);

comment on table public.profiles is 'Extends auth.users with LED Zone ERP-specific profile fields.';

create index profiles_location_id_idx on public.profiles (location_id);
create index profiles_created_by_idx on public.profiles (created_by);
create index profiles_updated_by_idx on public.profiles (updated_by);
create index profiles_deleted_by_idx on public.profiles (deleted_by);

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row
  execute function public.set_updated_at();

-- Auto-create a profile row whenever a new Supabase Auth user is created
-- (admin-provisioned invite, never public self-signup).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', new.email));
  return new;
end;
$$;

-- This is a trigger-only function: it must never be callable directly over PostgREST.
-- Triggers fire regardless of the invoking role's own EXECUTE grant, so revoking here
-- does not break auth.users signup.
revoke execute on function public.handle_new_user() from anon, authenticated, public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

alter table public.profiles enable row level security;

create policy "profiles_select_own"
  on public.profiles for select
  to authenticated
  using (id = (select auth.uid()));

create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));
