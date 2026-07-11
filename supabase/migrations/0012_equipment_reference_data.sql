-- 0012_equipment_reference_data: Inventory Foundation, part 1. Reference/taxonomy data
-- shared by every equipment record: categories, manufacturers, brands, suppliers, and
-- bin/rack-level storage locations within a Module 1 `locations` site.

create table public.equipment_categories (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.equipment_categories (id),
  name text not null,
  description text,
  icon text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id),
  updated_by uuid references public.profiles (id),
  deleted_at timestamptz,
  deleted_by uuid references public.profiles (id)
);

comment on table public.equipment_categories is
  'Equipment taxonomy (Lighting > Moving Heads, Audio > Wireless Mics, ...). Self-referencing parent_id supports nesting.';

create index equipment_categories_parent_id_idx on public.equipment_categories (parent_id);
create index equipment_categories_created_by_idx on public.equipment_categories (created_by);
create index equipment_categories_updated_by_idx on public.equipment_categories (updated_by);
create index equipment_categories_deleted_by_idx on public.equipment_categories (deleted_by);

create trigger set_equipment_categories_updated_at
  before update on public.equipment_categories
  for each row
  execute function public.set_updated_at();

create table public.manufacturers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  country text,
  website text,
  support_email text,
  support_phone text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id),
  updated_by uuid references public.profiles (id),
  deleted_at timestamptz,
  deleted_by uuid references public.profiles (id)
);

comment on table public.manufacturers is 'Who makes the equipment (OEM) — distinct from suppliers, who LED Zone buys from.';

create index manufacturers_created_by_idx on public.manufacturers (created_by);
create index manufacturers_updated_by_idx on public.manufacturers (updated_by);
create index manufacturers_deleted_by_idx on public.manufacturers (deleted_by);

create trigger set_manufacturers_updated_at
  before update on public.manufacturers
  for each row
  execute function public.set_updated_at();

create table public.brands (
  id uuid primary key default gen_random_uuid(),
  manufacturer_id uuid references public.manufacturers (id),
  name text not null,
  website text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id),
  updated_by uuid references public.profiles (id),
  deleted_at timestamptz,
  deleted_by uuid references public.profiles (id)
);

comment on table public.brands is
  'A brand equipment is sold under. Usually 1:1 with a manufacturer, but not forced to be — a manufacturer can own multiple brands.';

create index brands_manufacturer_id_idx on public.brands (manufacturer_id);
create index brands_created_by_idx on public.brands (created_by);
create index brands_updated_by_idx on public.brands (updated_by);
create index brands_deleted_by_idx on public.brands (deleted_by);

create trigger set_brands_updated_at
  before update on public.brands
  for each row
  execute function public.set_updated_at();

create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_name text,
  email text,
  phone text,
  address text,
  country text,
  preferred_currency text references public.currencies (code),
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id),
  updated_by uuid references public.profiles (id),
  deleted_at timestamptz,
  deleted_by uuid references public.profiles (id)
);

comment on table public.suppliers is 'Vendors LED Zone purchases equipment from.';

create index suppliers_preferred_currency_idx on public.suppliers (preferred_currency);
create index suppliers_created_by_idx on public.suppliers (created_by);
create index suppliers_updated_by_idx on public.suppliers (updated_by);
create index suppliers_deleted_by_idx on public.suppliers (deleted_by);

create trigger set_suppliers_updated_at
  before update on public.suppliers
  for each row
  execute function public.set_updated_at();

create table public.storage_locations (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references public.locations (id),
  name text not null,
  code text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id),
  updated_by uuid references public.profiles (id),
  deleted_at timestamptz,
  deleted_by uuid references public.profiles (id)
);

comment on table public.storage_locations is
  'Bin/rack/shelf-level spot within a Module 1 site. Tracks "where is this item right now" only — transfer-request/receiving workflows belong to the future Warehouse module.';

create index storage_locations_location_id_idx on public.storage_locations (location_id);
create index storage_locations_created_by_idx on public.storage_locations (created_by);
create index storage_locations_updated_by_idx on public.storage_locations (updated_by);
create index storage_locations_deleted_by_idx on public.storage_locations (deleted_by);

create trigger set_storage_locations_updated_at
  before update on public.storage_locations
  for each row
  execute function public.set_updated_at();

alter table public.equipment_categories enable row level security;
alter table public.manufacturers enable row level security;
alter table public.brands enable row level security;
alter table public.suppliers enable row level security;
alter table public.storage_locations enable row level security;

create policy "equipment_categories_select_viewers"
  on public.equipment_categories for select
  to authenticated
  using (public.has_permission((select auth.uid()), 'inventory.view'));

create policy "equipment_categories_insert_managers"
  on public.equipment_categories for insert
  to authenticated
  with check (public.has_permission((select auth.uid()), 'inventory.manage'));

create policy "equipment_categories_update_managers"
  on public.equipment_categories for update
  to authenticated
  using (public.has_permission((select auth.uid()), 'inventory.manage'))
  with check (public.has_permission((select auth.uid()), 'inventory.manage'));

create policy "equipment_categories_delete_managers"
  on public.equipment_categories for delete
  to authenticated
  using (public.has_permission((select auth.uid()), 'inventory.manage'));

create policy "manufacturers_select_viewers"
  on public.manufacturers for select
  to authenticated
  using (public.has_permission((select auth.uid()), 'inventory.view'));

create policy "manufacturers_insert_managers"
  on public.manufacturers for insert
  to authenticated
  with check (public.has_permission((select auth.uid()), 'inventory.manage'));

create policy "manufacturers_update_managers"
  on public.manufacturers for update
  to authenticated
  using (public.has_permission((select auth.uid()), 'inventory.manage'))
  with check (public.has_permission((select auth.uid()), 'inventory.manage'));

create policy "manufacturers_delete_managers"
  on public.manufacturers for delete
  to authenticated
  using (public.has_permission((select auth.uid()), 'inventory.manage'));

create policy "brands_select_viewers"
  on public.brands for select
  to authenticated
  using (public.has_permission((select auth.uid()), 'inventory.view'));

create policy "brands_insert_managers"
  on public.brands for insert
  to authenticated
  with check (public.has_permission((select auth.uid()), 'inventory.manage'));

create policy "brands_update_managers"
  on public.brands for update
  to authenticated
  using (public.has_permission((select auth.uid()), 'inventory.manage'))
  with check (public.has_permission((select auth.uid()), 'inventory.manage'));

create policy "brands_delete_managers"
  on public.brands for delete
  to authenticated
  using (public.has_permission((select auth.uid()), 'inventory.manage'));

create policy "suppliers_select_viewers"
  on public.suppliers for select
  to authenticated
  using (public.has_permission((select auth.uid()), 'inventory.view'));

create policy "suppliers_insert_managers"
  on public.suppliers for insert
  to authenticated
  with check (public.has_permission((select auth.uid()), 'inventory.manage'));

create policy "suppliers_update_managers"
  on public.suppliers for update
  to authenticated
  using (public.has_permission((select auth.uid()), 'inventory.manage'))
  with check (public.has_permission((select auth.uid()), 'inventory.manage'));

create policy "suppliers_delete_managers"
  on public.suppliers for delete
  to authenticated
  using (public.has_permission((select auth.uid()), 'inventory.manage'));

create policy "storage_locations_select_viewers"
  on public.storage_locations for select
  to authenticated
  using (public.has_permission((select auth.uid()), 'inventory.view'));

create policy "storage_locations_insert_managers"
  on public.storage_locations for insert
  to authenticated
  with check (public.has_permission((select auth.uid()), 'inventory.manage'));

create policy "storage_locations_update_managers"
  on public.storage_locations for update
  to authenticated
  using (public.has_permission((select auth.uid()), 'inventory.manage'))
  with check (public.has_permission((select auth.uid()), 'inventory.manage'));

create policy "storage_locations_delete_managers"
  on public.storage_locations for delete
  to authenticated
  using (public.has_permission((select auth.uid()), 'inventory.manage'));
