import { requirePermission, hasPermission } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { TransferTable } from "@/modules/warehouse/components/transfers/transfer-table";
import { TransferCreateDialog } from "@/modules/warehouse/components/transfers/transfer-create-dialog";
import type { WarehouseTransferRow } from "@/modules/warehouse/repositories/warehouse-transfer-repository";
import type { WarehouseRow } from "@/modules/warehouse/repositories/warehouse-repository";
import type { WarehouseLocationRow } from "@/modules/warehouse/repositories/warehouse-location-repository";

const TRANSFER_COLUMNS =
  "id, from_warehouse_id, to_warehouse_id, from_location_id, to_location_id, status, requested_by, approved_by, requested_at, approved_at, completed_at, notes";
const LOCATION_COLUMNS =
  "id, warehouse_id, parent_id, node_type, location_category, code, full_code, name, capacity_units, weight_limit_kg, length_cm, width_cm, height_cm, is_placeable, status";

export default async function TransfersPage() {
  await requirePermission("warehouse.view");

  const supabase = await createClient();
  const [{ data: transfers }, { data: warehouses }, { data: locations }, { data: items }, { data: models }, canTransfer] =
    await Promise.all([
      supabase.from("warehouse_transfers").select(TRANSFER_COLUMNS).is("deleted_at", null).order("requested_at", { ascending: false }),
      supabase.from("warehouses").select("id, name, code").is("deleted_at", null).order("name"),
      supabase.from("warehouse_locations").select(LOCATION_COLUMNS).is("deleted_at", null).eq("is_placeable", true),
      supabase.from("equipment_items").select("id, asset_tag").is("deleted_at", null).eq("current_status", "available"),
      supabase.from("equipment_models").select("id, model_name").eq("tracking_type", "consumable").is("deleted_at", null),
      hasPermission("warehouse.manage").then((v) => v || hasPermission("warehouse.transfer")),
    ]);

  const warehouseRows = (warehouses ?? []) as Pick<WarehouseRow, "id" | "name" | "code">[];
  const warehouseNames = Object.fromEntries(warehouseRows.map((w) => [w.id, w.name]));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Transfers</h1>
          <p className="text-muted-foreground text-sm">Warehouse-to-warehouse and location-to-location moves.</p>
        </div>
        {canTransfer && (
          <TransferCreateDialog
            warehouses={warehouseRows as WarehouseRow[]}
            locations={(locations ?? []) as WarehouseLocationRow[]}
            items={(items ?? []).map((i) => ({ id: i.id, label: i.asset_tag }))}
            consumableModels={(models ?? []).map((m) => ({ id: m.id, label: m.model_name }))}
          />
        )}
      </div>
      <TransferTable transfers={(transfers ?? []) as WarehouseTransferRow[]} warehouseNames={warehouseNames} />
    </div>
  );
}
