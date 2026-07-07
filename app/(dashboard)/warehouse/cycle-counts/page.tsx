import { requirePermission, hasPermission } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { CycleCountTable } from "@/modules/warehouse/components/cycle-counts/cycle-count-table";
import { CycleCountCreateDialog } from "@/modules/warehouse/components/cycle-counts/cycle-count-create-dialog";
import type { WarehouseCycleCountRow } from "@/modules/warehouse/repositories/warehouse-cycle-count-repository";
import type { WarehouseRow } from "@/modules/warehouse/repositories/warehouse-repository";

const COUNT_COLUMNS =
  "id, warehouse_id, scope_type, scope_location_id, status, scheduled_date, started_at, completed_at, created_by, approved_by";

export default async function CycleCountsPage() {
  await requirePermission("warehouse.view");

  const supabase = await createClient();
  const [{ data: cycleCounts }, { data: warehouses }, { data: items }, { data: models }, canCount] = await Promise.all([
    supabase.from("warehouse_cycle_counts").select(COUNT_COLUMNS).order("scheduled_date", { ascending: false }),
    supabase.from("warehouses").select("id, name, code").is("deleted_at", null).order("name"),
    supabase.from("equipment_items").select("id, asset_tag").is("deleted_at", null),
    supabase.from("equipment_models").select("id, model_name").eq("tracking_type", "consumable").is("deleted_at", null),
    hasPermission("warehouse.manage").then((v) => v || hasPermission("warehouse.count")),
  ]);

  const warehouseRows = (warehouses ?? []) as Pick<WarehouseRow, "id" | "name" | "code">[];
  const warehouseNames = Object.fromEntries(warehouseRows.map((w) => [w.id, w.name]));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Cycle counts</h1>
          <p className="text-muted-foreground text-sm">Compare expected vs. actual quantities and reconcile variances.</p>
        </div>
        {canCount && (
          <CycleCountCreateDialog
            warehouses={warehouseRows as WarehouseRow[]}
            items={(items ?? []).map((i) => ({ id: i.id, label: i.asset_tag }))}
            consumableModels={(models ?? []).map((m) => ({ id: m.id, label: m.model_name }))}
          />
        )}
      </div>
      <CycleCountTable cycleCounts={(cycleCounts ?? []) as WarehouseCycleCountRow[]} warehouseNames={warehouseNames} />
    </div>
  );
}
