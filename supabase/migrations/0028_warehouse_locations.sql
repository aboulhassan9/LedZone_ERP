-- 0028_warehouse_locations: the Zone->Row->Rack->Shelf->Bin (+ staging/loading/repair/
-- quarantine/dock/charging) hierarchy within a warehouse. Self-referencing `parent_id`,
-- scoped to one warehouse. `full_code` (e.g. "A-03-R12-S2-B04") and `is_placeable` are
-- trigger-maintained, not settable directly, so they can never drift from the hierarchy.

create table public.warehouse_locations (
  id uuid primary key default gen_random_uuid(),
  warehouse_id uuid not null references public.warehouses (id),
  parent_id uuid references public.warehouse_locations (id),
  node_type text not null check (
    node_type in (
      'zone', 'row', 'rack', 'shelf', 'bin',
      'staging_area', 'loading_zone', 'repair_zone', 'quarantine_area', 'dock', 'charging_station'
    )
  ),
  location_category text check (
    location_category in (
      'general', 'high_value', 'led_panels', 'audio', 'lighting', 'camera', 'rigging',
      'consumables', 'repair', 'damaged', 'reserved', 'quarantine', 'dispatch', 'receiving',
      'returns', 'charging', 'battery', 'cable_storage', 'accessory_storage', 'custom'
    )
  ),
  code text not null,
  full_code text,
  name text,
  capacity_units numeric(12, 2),
  weight_limit_kg numeric(12, 2),
  length_cm numeric(10, 2),
  width_cm numeric(10, 2),
  height_cm numeric(10, 2),
  is_placeable boolean not null default false,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id),
  updated_by uuid references public.profiles (id),
  deleted_at timestamptz,
  deleted_by uuid references public.profiles (id)
);

comment on table public.warehouse_locations is
  'Zone/Row/Rack/Shelf/Bin (+ staging/loading/repair/quarantine/dock/charging) hierarchy for one warehouse. full_code and is_placeable are derived by maintain_warehouse_location() — never set directly by the application.';

create unique index warehouse_locations_full_code_uq
  on public.warehouse_locations (warehouse_id, full_code)
  where deleted_at is null;

create index warehouse_locations_warehouse_id_idx on public.warehouse_locations (warehouse_id);
create index warehouse_locations_parent_id_idx on public.warehouse_locations (parent_id);
create index warehouse_locations_node_type_idx on public.warehouse_locations (node_type);
create index warehouse_locations_location_category_idx on public.warehouse_locations (location_category);
create index warehouse_locations_created_by_idx on public.warehouse_locations (created_by);
create index warehouse_locations_updated_by_idx on public.warehouse_locations (updated_by);
create index warehouse_locations_deleted_by_idx on public.warehouse_locations (deleted_by);

-- Derives full_code (ancestor codes joined with '-') and is_placeable (true only for leaf/
-- addressable node types — zone/row/rack are pure containers) on every insert/update, and
-- rejects a parent from a different warehouse or a parent that would create a cycle.
-- Bounded to 20 levels of ancestry — the real hierarchy is ~5 levels deep, so this is purely
-- a defensive limit against a runaway chain, not an expected depth.
create or replace function public.maintain_warehouse_location()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_parent public.warehouse_locations%rowtype;
  v_current_id uuid;
  v_depth int := 0;
begin
  if new.parent_id is not null then
    select * into v_parent from public.warehouse_locations where id = new.parent_id;
    if not found then
      raise exception 'Parent location % does not exist', new.parent_id;
    end if;
    if v_parent.warehouse_id <> new.warehouse_id then
      raise exception 'Parent location must belong to the same warehouse';
    end if;

    v_current_id := new.parent_id;
    while v_current_id is not null and v_depth < 20 loop
      if v_current_id = new.id then
        raise exception 'Cycle detected: a location cannot be its own ancestor';
      end if;
      select parent_id into v_current_id from public.warehouse_locations where id = v_current_id;
      v_depth := v_depth + 1;
    end loop;

    new.full_code := v_parent.full_code || '-' || new.code;
  else
    new.full_code := new.code;
  end if;

  new.is_placeable := new.node_type in (
    'shelf', 'bin', 'staging_area', 'loading_zone', 'repair_zone', 'quarantine_area', 'dock', 'charging_station'
  );

  return new;
end;
$$;

create trigger maintain_warehouse_location_derived_fields
  before insert or update of parent_id, code, node_type, warehouse_id
  on public.warehouse_locations
  for each row
  execute function public.maintain_warehouse_location();

create trigger set_warehouse_locations_updated_at
  before update on public.warehouse_locations
  for each row
  execute function public.set_updated_at();

alter table public.warehouse_locations enable row level security;

create policy "warehouse_locations_select_viewers"
  on public.warehouse_locations for select
  to authenticated
  using (public.has_permission((select auth.uid()), 'warehouse.view'));

create policy "warehouse_locations_insert_managers"
  on public.warehouse_locations for insert
  to authenticated
  with check (
    public.has_permission((select auth.uid()), 'warehouse.manage')
    or public.has_permission((select auth.uid()), 'warehouse.location.manage')
    or public.has_permission((select auth.uid()), 'warehouse.bin.manage')
  );

create policy "warehouse_locations_update_managers"
  on public.warehouse_locations for update
  to authenticated
  using (
    public.has_permission((select auth.uid()), 'warehouse.manage')
    or public.has_permission((select auth.uid()), 'warehouse.location.manage')
    or public.has_permission((select auth.uid()), 'warehouse.bin.manage')
  )
  with check (
    public.has_permission((select auth.uid()), 'warehouse.manage')
    or public.has_permission((select auth.uid()), 'warehouse.location.manage')
    or public.has_permission((select auth.uid()), 'warehouse.bin.manage')
  );
