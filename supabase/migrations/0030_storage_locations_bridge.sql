-- 0030_storage_locations_bridge: the ONLY change to the previously-approved
-- `storage_locations` table (Module 2). Adds one nullable column so an existing
-- storage_locations row (still what equipment_items.current_storage_location_id points at —
-- unchanged) can optionally be pinned to a specific bin/leaf node in the new
-- warehouse_locations hierarchy (0028). Every existing FK, RLS policy, query, and UI page in
-- Module 2 keeps working untouched; this is purely additive.

alter table public.storage_locations
  add column warehouse_location_id uuid references public.warehouse_locations (id);

comment on column public.storage_locations.warehouse_location_id is
  'Optional bridge to the detailed Warehouse Management hierarchy (warehouse_locations). Null for storage locations not yet mapped into a warehouse layout.';

create index storage_locations_warehouse_location_id_idx
  on public.storage_locations (warehouse_location_id);
