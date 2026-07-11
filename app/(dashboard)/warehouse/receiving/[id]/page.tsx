import { notFound } from "next/navigation";
import { requirePermission, hasPermission } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { ReceivingDetail } from "@/modules/warehouse/components/receiving/receiving-detail";
import { DocumentList } from "@/modules/warehouse/components/documents/document-list";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  WarehouseReceivingRow,
  WarehouseReceivingLineRow,
} from "@/modules/warehouse/repositories/warehouse-receiving-repository";

export default async function ReceivingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("warehouse.view");
  const { id } = await params;

  const supabase = await createClient();
  const { data: record } = await supabase
    .from("warehouse_receiving_records")
    .select("id, warehouse_id, source_type, purchase_id, reference_note, received_by, received_at, status")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (!record) notFound();
  const recordRow = record as WarehouseReceivingRow;

  const [{ data: lines }, { data: warehouse }, canUpload] = await Promise.all([
    supabase
      .from("warehouse_receiving_lines")
      .select("id, receiving_id, item_id, model_id, quantity, condition_on_arrival, damage_report_id, destination_warehouse_location_id, placed")
      .eq("receiving_id", id),
    supabase.from("warehouses").select("id, name").eq("id", recordRow.warehouse_id).maybeSingle(),
    hasPermission("warehouse.manage").then((v) => v || hasPermission("warehouse.receive")),
  ]);

  const lineRows = (lines ?? []) as WarehouseReceivingLineRow[];
  const itemIds = lineRows.filter((l) => l.item_id).map((l) => l.item_id as string);
  const modelIds = lineRows.filter((l) => l.model_id).map((l) => l.model_id as string);
  const locationIds = lineRows
    .filter((l) => l.destination_warehouse_location_id)
    .map((l) => l.destination_warehouse_location_id as string);

  const [{ data: items }, { data: models }, { data: locations }] = await Promise.all([
    itemIds.length
      ? supabase.from("equipment_items").select("id, asset_tag").in("id", itemIds)
      : Promise.resolve({ data: [] }),
    modelIds.length
      ? supabase.from("equipment_models").select("id, model_name").in("id", modelIds)
      : Promise.resolve({ data: [] }),
    locationIds.length
      ? supabase.from("warehouse_locations").select("id, full_code").in("id", locationIds)
      : Promise.resolve({ data: [] }),
  ]);

  const itemLabels = Object.fromEntries((items ?? []).map((i) => [i.id, i.asset_tag]));
  const modelLabels = Object.fromEntries((models ?? []).map((m) => [m.id, m.model_name]));
  const locationCodes = Object.fromEntries((locations ?? []).map((l) => [l.id, l.full_code ?? l.id]));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Receiving</h1>
        <p className="text-muted-foreground text-sm">Inspect and place received lines.</p>
      </div>
      <ReceivingDetail
        record={recordRow}
        lines={lineRows}
        warehouseName={warehouse?.name ?? "—"}
        itemLabels={itemLabels}
        modelLabels={modelLabels}
        locationCodes={locationCodes}
      />
      <Card>
        <CardHeader>
          <CardTitle>Documents</CardTitle>
        </CardHeader>
        <CardContent>
          <DocumentList relatedEntityType="receiving" relatedEntityId={id} canUpload={canUpload} />
        </CardContent>
      </Card>
    </div>
  );
}
