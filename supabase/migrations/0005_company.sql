-- 0005_company: the LED Zone company profile (singleton) + physical locations
-- (stores/warehouses in Kinshasa). Other modules (Inventory, Events, Warehouse) will
-- reference `locations` once they exist.

create table public.locations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  city text not null default 'Kinshasa',
  country text not null default 'Democratic Republic of Congo',
  phone text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id),
  updated_by uuid references public.profiles (id),
  deleted_at timestamptz,
  deleted_by uuid references public.profiles (id)
);

comment on table public.locations is 'LED Zone stores/warehouses. Referenced by future Inventory/Warehouse/Events modules.';

create index locations_created_by_idx on public.locations (created_by);
create index locations_updated_by_idx on public.locations (updated_by);
create index locations_deleted_by_idx on public.locations (deleted_by);

create trigger set_locations_updated_at
  before update on public.locations
  for each row
  execute function public.set_updated_at();

alter table public.profiles
  add constraint profiles_location_id_fkey
  foreign key (location_id) references public.locations (id);

create table public.company_profile (
  id uuid primary key default gen_random_uuid(),
  singleton boolean not null default true,
  legal_name text not null default 'LED Zone',
  display_name text not null default 'LED Zone',
  address text,
  city text not null default 'Kinshasa',
  country text not null default 'Democratic Republic of Congo',
  phone text,
  email text,
  logo_url text, -- points to the `logos` Supabase Storage bucket, not public/
  default_currency text not null default 'USD',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id),
  constraint company_profile_singleton_ck check (singleton),
  constraint company_profile_singleton_uq unique (singleton)
);

comment on table public.company_profile is
  'Single-row table holding LED Zone''s company-wide settings. The singleton constraint guarantees only one row can ever exist.';

create index company_profile_updated_by_idx on public.company_profile (updated_by);

create trigger set_company_profile_updated_at
  before update on public.company_profile
  for each row
  execute function public.set_updated_at();

insert into public.company_profile (legal_name, display_name, address, city, country)
values ('LED Zone', 'LED Zone', null, 'Kinshasa', 'Democratic Republic of Congo');

alter table public.locations enable row level security;
alter table public.company_profile enable row level security;

create policy "locations_select_authenticated"
  on public.locations for select
  to authenticated
  using (true);

create policy "locations_insert_managers"
  on public.locations for insert
  to authenticated
  with check (public.has_permission((select auth.uid()), 'company.manage'));

create policy "locations_update_managers"
  on public.locations for update
  to authenticated
  using (public.has_permission((select auth.uid()), 'company.manage'))
  with check (public.has_permission((select auth.uid()), 'company.manage'));

create policy "locations_delete_managers"
  on public.locations for delete
  to authenticated
  using (public.has_permission((select auth.uid()), 'company.manage'));

create policy "company_profile_select_authenticated"
  on public.company_profile for select
  to authenticated
  using (true);

create policy "company_profile_update_managers"
  on public.company_profile for update
  to authenticated
  using (public.has_permission((select auth.uid()), 'company.manage'))
  with check (public.has_permission((select auth.uid()), 'company.manage'));
