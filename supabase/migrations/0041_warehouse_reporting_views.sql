-- 0041_warehouse_reporting_views: capacity/occupancy reporting (spec section 11). Computed
-- via views, not a maintained counter column, so occupancy can never drift from the
-- equipment_items/consumable_stock_levels rows it's derived from (see the design doc's
-- "Capacity & occupancy" note — a maintained counter is a pure additive optimization for
-- later if this proves too slow at scale). Per-item weight/volume isn't tracked anywhere yet
-- (not even in equipment_models), so weight/volume utilization can only compare against a
-- bin's own weight_limit_kg using unit counts, not true item weights — noted as a known
-- limitation, not solved here.

create view public.warehouse_location_occupancy as
select
  wl.id as warehouse_location_id,
  wl.warehouse_id,
  wl.full_code,
  wl.node_type,
  wl.location_category,
  wl.capacity_units,
  wl.weight_limit_kg,
  sl.id as storage_location_id,
  coalesce(item_counts.equipment_count, 0) as equipment_count,
  coalesce(stock_totals.consumable_qty, 0) as consumable_qty,
  coalesce(item_counts.equipment_count, 0) + coalesce(stock_totals.consumable_qty, 0) as occupied_units,
  case
    when wl.capacity_units is null or wl.capacity_units = 0 then null
    else round(
      (coalesce(item_counts.equipment_count, 0) + coalesce(stock_totals.consumable_qty, 0))
      / wl.capacity_units * 100, 2
    )
  end as utilization_pct
from public.warehouse_locations wl
left join public.storage_locations sl
  on sl.warehouse_location_id = wl.id and sl.deleted_at is null
left join lateral (
  select count(*) as equipment_count
  from public.equipment_items ei
  where ei.current_storage_location_id = sl.id and ei.deleted_at is null
) item_counts on true
left join lateral (
  select sum(csl.quantity_on_hand) as consumable_qty
  from public.consumable_stock_levels csl
  where csl.storage_location_id = sl.id
) stock_totals on true
where wl.is_placeable and wl.deleted_at is null;

comment on view public.warehouse_location_occupancy is
  'Per-bin occupancy: live equipment count + consumable quantity against the bin''s declared capacity_units. Only placeable nodes (bin/staging/loading/repair/quarantine/dock/charging) are included — zone/row/rack are pure containers.';

create view public.warehouse_capacity_summary as
select
  w.id as warehouse_id,
  w.name,
  w.code,
  w.warehouse_type,
  w.capacity_volume_m3,
  w.capacity_weight_kg,
  count(occ.warehouse_location_id) as bin_count,
  count(occ.warehouse_location_id) filter (where occ.occupied_units > 0) as occupied_bin_count,
  count(occ.warehouse_location_id) filter (where occ.occupied_units = 0) as empty_bin_count,
  sum(occ.equipment_count) as total_equipment_count,
  sum(occ.consumable_qty) as total_consumable_qty
from public.warehouses w
left join public.warehouse_location_occupancy occ on occ.warehouse_id = w.id
where w.deleted_at is null
group by w.id, w.name, w.code, w.warehouse_type, w.capacity_volume_m3, w.capacity_weight_kg;

comment on view public.warehouse_capacity_summary is
  'Per-warehouse rollup: bin/occupied-bin/empty-bin counts and total equipment/consumable quantity, for the Warehouse dashboard and capacity reports.';

alter view public.warehouse_location_occupancy set (security_invoker = true);
alter view public.warehouse_capacity_summary set (security_invoker = true);
