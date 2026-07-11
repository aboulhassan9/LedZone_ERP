-- 0027_warehouses: Module 3 (Warehouse Management). A warehouse is the top-level physical
-- site that owns a Zone->Row->Rack->Shelf->Bin layout (0028). It optionally references a
-- Module 1 `locations` row (reuses the existing site/address concept instead of duplicating
-- it), the same way `storage_locations` already does. "Mobile Truck Warehouse" is just
-- `warehouse_type = 'mobile_truck'` — no separate truck table.

create table public.warehouses (
  id uuid primary key default gen_random_uuid(),
  location_id uuid references public.locations (id),
  name text not null,
  code text not null,
  description text,
  warehouse_type text not null default 'main' check (
    warehouse_type in ('main', 'secondary', 'event', 'repair_center', 'temporary', 'mobile_truck')
  ),
  address text,
  gps_lat numeric(9, 6),
  gps_lng numeric(9, 6),
  manager_id uuid references public.profiles (id),
  contact_phone text,
  contact_email text,
  capacity_volume_m3 numeric(12, 2),
  capacity_weight_kg numeric(12, 2),
  is_default boolean not null default false,
  is_active boolean not null default true,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id),
  updated_by uuid references public.profiles (id),
  deleted_at timestamptz,
  deleted_by uuid references public.profiles (id)
);

comment on table public.warehouses is
  'Top-level warehouse sites (including mobile trucks and temporary/event warehouses). Layout detail lives in warehouse_locations (0028).';

-- Unique code among non-deleted warehouses (a soft-deleted warehouse's code can be reused).
create unique index warehouses_code_uq on public.warehouses (code) where deleted_at is null;

-- At most one default warehouse among non-deleted rows.
create unique index warehouses_default_uq on public.warehouses (is_default) where is_default and deleted_at is null;

create index warehouses_location_id_idx on public.warehouses (location_id);
create index warehouses_manager_id_idx on public.warehouses (manager_id);
create index warehouses_warehouse_type_idx on public.warehouses (warehouse_type);
create index warehouses_created_by_idx on public.warehouses (created_by);
create index warehouses_updated_by_idx on public.warehouses (updated_by);
create index warehouses_deleted_by_idx on public.warehouses (deleted_by);

create trigger set_warehouses_updated_at
  before update on public.warehouses
  for each row
  execute function public.set_updated_at();

alter table public.warehouses enable row level security;

create policy "warehouses_select_viewers"
  on public.warehouses for select
  to authenticated
  using (public.has_permission((select auth.uid()), 'warehouse.view'));

create policy "warehouses_insert_managers"
  on public.warehouses for insert
  to authenticated
  with check (
    public.has_permission((select auth.uid()), 'warehouse.manage')
    or public.has_permission((select auth.uid()), 'warehouse.create')
  );

create policy "warehouses_update_managers"
  on public.warehouses for update
  to authenticated
  using (
    public.has_permission((select auth.uid()), 'warehouse.manage')
    or public.has_permission((select auth.uid()), 'warehouse.update')
    or public.has_permission((select auth.uid()), 'warehouse.delete')
  )
  with check (
    public.has_permission((select auth.uid()), 'warehouse.manage')
    or public.has_permission((select auth.uid()), 'warehouse.update')
    or public.has_permission((select auth.uid()), 'warehouse.delete')
  );
