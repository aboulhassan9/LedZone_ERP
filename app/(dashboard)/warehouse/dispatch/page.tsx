import { requirePermission, hasPermission } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { DispatchTable } from "@/modules/warehouse/components/dispatch/dispatch-table";
import { DispatchCreateDialog } from "@/modules/warehouse/components/dispatch/dispatch-create-dialog";
import type { WarehouseDispatchRow } from "@/modules/warehouse/repositories/warehouse-dispatch-repository";
import type { WarehouseRow } from "@/modules/warehouse/repositories/warehouse-repository";

const RECORD_COLUMNS =
  "id, warehouse_id, destination_type, destination_reference, dispatched_by, dispatched_at, signature_url, status, notes";

export default async function DispatchPage() {
  await requirePermission("warehouse.view");

  const supabase = await createClient();
  const [{ data: records }, { data: warehouses }, { data: items }, { data: models }, { data: locations }, canDispatch] =
    await Promise.all([
      supabase.from("warehouse_dispatch_records").select(RECORD_COLUMNS).is("deleted_at", null).order("dispatched_at", { ascending: false }),
      supabase.from("warehouses").select("id, name, code").is("deleted_at", null).order("name"),
      supabase.from("equipment_items").select("id, asset_tag").is("deleted_at", null).in("current_status", ["available", "reserved", "picked"]),
      supabase.from("equipment_models").select("id, model_name").eq("tracking_type", "consumable").is("deleted_at", null),
      supabase.from("warehouse_locations").select("id, full_code").is("deleted_at", null).eq("is_placeable", true),
      hasPermission("warehouse.manage").then((v) => v || hasPermission("warehouse.dispatch")),
    ]);

  const warehouseRows = (warehouses ?? []) as Pick<WarehouseRow, "id" | "name" | "code">[];
  const warehouseNames = Object.fromEntries(warehouseRows.map((w) => [w.id, w.name]));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dispatch</h1>
          <p className="text-muted-foreground text-sm">Equipment and consumables going out of a warehouse.</p>
        </div>
        {canDispatch && (
          <DispatchCreateDialog
            warehouses={warehouseRows as WarehouseRow[]}
            items={(items ?? []).map((i) => ({ id: i.id, label: i.asset_tag }))}
            consumableModels={(models ?? []).map((m) => ({ id: m.id, label: m.model_name }))}
            locations={(locations ?? []).map((l) => ({ id: l.id, label: l.full_code ?? l.id }))}
          />
        )}
      </div>
      <DispatchTable records={(records ?? []) as WarehouseDispatchRow[]} warehouseNames={warehouseNames} />
    </div>
  );
}
