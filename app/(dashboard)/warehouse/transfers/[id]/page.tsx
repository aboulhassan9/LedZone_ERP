import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { TransferDetail } from "@/modules/warehouse/components/transfers/transfer-detail";
import type {
  WarehouseTransferRow,
  WarehouseTransferLineRow,
} from "@/modules/warehouse/repositories/warehouse-transfer-repository";

export default async function TransferDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("warehouse.view");
  const { id } = await params;

  const supabase = await createClient();
  const { data: transfer } = await supabase
    .from("warehouse_transfers")
    .select(
      "id, from_warehouse_id, to_warehouse_id, from_location_id, to_location_id, status, requested_by, approved_by, requested_at, approved_at, completed_at, notes"
    )
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (!transfer) notFound();
  const transferRow = transfer as WarehouseTransferRow;

  const [{ data: lines }, { data: warehouses }, { data: locations }] = await Promise.all([
    supabase.from("warehouse_transfer_lines").select("id, transfer_id, item_id, model_id, quantity, status").eq("transfer_id", id),
    supabase.from("warehouses").select("id, name"),
    supabase.from("warehouse_locations").select("id, full_code"),
  ]);

  const lineRows = (lines ?? []) as WarehouseTransferLineRow[];
  const itemIds = lineRows.filter((l) => l.item_id).map((l) => l.item_id as string);
  const modelIds = lineRows.filter((l) => l.model_id).map((l) => l.model_id as string);

  const [{ data: items }, { data: models }] = await Promise.all([
    itemIds.length
      ? supabase.from("equipment_items").select("id, asset_tag").in("id", itemIds)
      : Promise.resolve({ data: [] }),
    modelIds.length
      ? supabase.from("equipment_models").select("id, model_name").in("id", modelIds)
      : Promise.resolve({ data: [] }),
  ]);

  const warehouseNames = Object.fromEntries((warehouses ?? []).map((w) => [w.id, w.name]));
  const locationCodes = Object.fromEntries((locations ?? []).map((l) => [l.id, l.full_code ?? l.id]));
  const itemLabels = Object.fromEntries((items ?? []).map((i) => [i.id, i.asset_tag]));
  const modelLabels = Object.fromEntries((models ?? []).map((m) => [m.id, m.model_name]));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Transfer</h1>
        <p className="text-muted-foreground text-sm">Approval and execution workflow.</p>
      </div>
      <TransferDetail
        transfer={transferRow}
        lines={lineRows}
        warehouseNames={warehouseNames}
        locationCodes={locationCodes}
        itemLabels={itemLabels}
        modelLabels={modelLabels}
      />
    </div>
  );
}
