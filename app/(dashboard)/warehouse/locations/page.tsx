import { requirePermission } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { WarehousePicker } from "@/modules/warehouse/components/locations/warehouse-picker";
import { LocationTree } from "@/modules/warehouse/components/locations/location-tree";
import type { WarehouseLocationRow } from "@/modules/warehouse/repositories/warehouse-location-repository";

const LOCATION_COLUMNS =
  "id, warehouse_id, parent_id, node_type, location_category, code, full_code, name, capacity_units, weight_limit_kg, length_cm, width_cm, height_cm, is_placeable, status";

export default async function WarehouseLocationsPage({
  searchParams,
}: {
  searchParams: Promise<{ warehouseId?: string }>;
}) {
  await requirePermission("warehouse.view");
  const { warehouseId: requestedWarehouseId } = await searchParams;

  const supabase = await createClient();
  const { data: warehouses } = await supabase
    .from("warehouses")
    .select("id, name, code, is_default")
    .is("deleted_at", null)
    .order("name");

  const warehouseRows = warehouses ?? [];
  const warehouseId =
    requestedWarehouseId ??
    warehouseRows.find((w) => w.is_default)?.id ??
    warehouseRows[0]?.id;

  if (!warehouseId) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-semibold tracking-tight">Location Explorer</h1>
        <p className="text-muted-foreground text-sm">
          No warehouses exist yet. Create one first from Warehouse Management.
        </p>
      </div>
    );
  }

  const [{ data: locations }, { data: occupancyRows }] = await Promise.all([
    supabase
      .from("warehouse_locations")
      .select(LOCATION_COLUMNS)
      .eq("warehouse_id", warehouseId)
      .is("deleted_at", null)
      .order("full_code"),
    supabase
      .from("warehouse_location_occupancy")
      .select("warehouse_location_id, capacity_units, occupied_units, utilization_pct")
      .eq("warehouse_id", warehouseId),
  ]);

  const occupancy = Object.fromEntries(
    (occupancyRows ?? []).map((o) => [
      o.warehouse_location_id,
      { capacity_units: o.capacity_units, occupied_units: o.occupied_units, utilization_pct: o.utilization_pct },
    ])
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Location Explorer</h1>
          <p className="text-muted-foreground text-sm">
            Zone → Row → Rack → Shelf → Bin layout, capacity, and contents.
          </p>
        </div>
        <WarehousePicker warehouses={warehouseRows} value={warehouseId} />
      </div>
      <LocationTree
        warehouseId={warehouseId}
        locations={(locations ?? []) as WarehouseLocationRow[]}
        occupancy={occupancy}
      />
    </div>
  );
}
