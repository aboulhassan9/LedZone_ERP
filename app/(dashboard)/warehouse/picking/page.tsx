import { requirePermission, hasPermission } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { PickListTable } from "@/modules/warehouse/components/picking/pick-list-table";
import { PickListCreateDialog } from "@/modules/warehouse/components/picking/pick-list-create-dialog";
import type { WarehousePickListRow } from "@/modules/warehouse/repositories/warehouse-picking-repository";
import type { WarehouseRow } from "@/modules/warehouse/repositories/warehouse-repository";

const LIST_COLUMNS = "id, warehouse_id, method, status, assigned_to, created_by, completed_at";

export default async function PickingPage() {
  await requirePermission("warehouse.view");

  const supabase = await createClient();
  const [{ data: pickLists }, { data: warehouses }, { data: items }, { data: models }, { data: profiles }, canPick] =
    await Promise.all([
      supabase.from("warehouse_pick_lists").select(LIST_COLUMNS).order("created_at", { ascending: false }),
      supabase.from("warehouses").select("id, name, code").is("deleted_at", null).order("name"),
      supabase.from("equipment_items").select("id, asset_tag").is("deleted_at", null).eq("current_status", "available"),
      supabase.from("equipment_models").select("id, model_name").eq("tracking_type", "consumable").is("deleted_at", null),
      supabase.from("profiles").select("id, full_name").order("full_name"),
      hasPermission("warehouse.manage").then((v) => v || hasPermission("warehouse.pick")),
    ]);

  const warehouseRows = (warehouses ?? []) as Pick<WarehouseRow, "id" | "name" | "code">[];
  const warehouseNames = Object.fromEntries(warehouseRows.map((w) => [w.id, w.name]));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Picking</h1>
          <p className="text-muted-foreground text-sm">Reserve and stage lines ready to move.</p>
        </div>
        {canPick && (
          <PickListCreateDialog
            warehouses={warehouseRows as WarehouseRow[]}
            items={(items ?? []).map((i) => ({ id: i.id, label: i.asset_tag }))}
            consumableModels={(models ?? []).map((m) => ({ id: m.id, label: m.model_name }))}
            profiles={profiles ?? []}
          />
        )}
      </div>
      <PickListTable pickLists={(pickLists ?? []) as WarehousePickListRow[]} warehouseNames={warehouseNames} />
    </div>
  );
}
