import { requirePermission, hasPermission } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { ReceivingTable } from "@/modules/warehouse/components/receiving/receiving-table";
import { ReceivingCreateDialog } from "@/modules/warehouse/components/receiving/receiving-create-dialog";
import type { WarehouseReceivingRow } from "@/modules/warehouse/repositories/warehouse-receiving-repository";
import type { WarehouseRow } from "@/modules/warehouse/repositories/warehouse-repository";

const RECORD_COLUMNS =
  "id, warehouse_id, source_type, purchase_id, reference_note, received_by, received_at, status";

export default async function ReceivingPage() {
  await requirePermission("warehouse.view");

  const supabase = await createClient();
  const [{ data: records }, { data: warehouses }, { data: purchases }, { data: items }, { data: models }, { data: locations }, canReceive] =
    await Promise.all([
      supabase.from("warehouse_receiving_records").select(RECORD_COLUMNS).is("deleted_at", null).order("received_at", { ascending: false }),
      supabase.from("warehouses").select("id, name, code").is("deleted_at", null).order("name"),
      supabase.from("equipment_purchases").select("id, invoice_number").order("created_at", { ascending: false }).limit(50),
      supabase.from("equipment_items").select("id, asset_tag").is("deleted_at", null).eq("current_status", "available"),
      supabase.from("equipment_models").select("id, model_name").eq("tracking_type", "consumable").is("deleted_at", null),
      supabase.from("warehouse_locations").select("id, full_code").is("deleted_at", null).eq("is_placeable", true),
      hasPermission("warehouse.manage").then((v) => v || hasPermission("warehouse.receive")),
    ]);

  const warehouseRows = (warehouses ?? []) as Pick<WarehouseRow, "id" | "name" | "code">[];
  const warehouseNames = Object.fromEntries(warehouseRows.map((w) => [w.id, w.name]));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Receiving</h1>
          <p className="text-muted-foreground text-sm">Equipment and consumables arriving into a warehouse.</p>
        </div>
        {canReceive && (
          <ReceivingCreateDialog
            warehouses={warehouseRows as WarehouseRow[]}
            purchases={(purchases ?? []) as { id: string; invoice_number: string | null }[]}
            items={(items ?? []).map((i) => ({ id: i.id, label: i.asset_tag }))}
            consumableModels={(models ?? []).map((m) => ({ id: m.id, label: m.model_name }))}
            locations={(locations ?? []).map((l) => ({ id: l.id, label: l.full_code ?? l.id }))}
          />
        )}
      </div>
      <ReceivingTable records={(records ?? []) as WarehouseReceivingRow[]} warehouseNames={warehouseNames} />
    </div>
  );
}
