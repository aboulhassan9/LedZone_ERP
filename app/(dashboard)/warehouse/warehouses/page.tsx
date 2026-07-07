import { requirePermission, hasPermission } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { WarehouseTable } from "@/modules/warehouse/components/warehouses/warehouse-table";
import { WarehouseFormDialog } from "@/modules/warehouse/components/warehouses/warehouse-form-dialog";
import type { WarehouseRow } from "@/modules/warehouse/repositories/warehouse-repository";

const WAREHOUSE_COLUMNS =
  "id, location_id, name, code, description, warehouse_type, address, gps_lat, gps_lng, manager_id, contact_phone, contact_email, capacity_volume_m3, capacity_weight_kg, is_default, is_active, status";

export default async function WarehousesPage() {
  await requirePermission("warehouse.view");

  const supabase = await createClient();
  const [{ data: warehouses }, { data: locations }, { data: profiles }, canManage] = await Promise.all([
    supabase.from("warehouses").select(WAREHOUSE_COLUMNS).is("deleted_at", null).order("name"),
    supabase.from("locations").select("id, name").is("deleted_at", null).order("name"),
    supabase.from("profiles").select("id, full_name").order("full_name"),
    hasPermission("warehouse.manage").then((v) => v || hasPermission("warehouse.create")),
  ]);

  const warehouseRows = (warehouses ?? []) as WarehouseRow[];
  const locationRows = locations ?? [];
  const profileRows = profiles ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Warehouses</h1>
          <p className="text-muted-foreground text-sm">
            Main, secondary, event, repair-center, temporary, and mobile-truck sites.
          </p>
        </div>
        {canManage && <WarehouseFormDialog locations={locationRows} profiles={profileRows} />}
      </div>
      <WarehouseTable warehouses={warehouseRows} locations={locationRows} profiles={profileRows} />
    </div>
  );
}
