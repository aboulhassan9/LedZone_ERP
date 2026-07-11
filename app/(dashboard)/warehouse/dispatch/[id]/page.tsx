import { notFound } from "next/navigation";
import { requirePermission, hasPermission } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { DispatchDetail } from "@/modules/warehouse/components/dispatch/dispatch-detail";
import { DocumentList } from "@/modules/warehouse/components/documents/document-list";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  WarehouseDispatchRow,
  WarehouseDispatchLineRow,
} from "@/modules/warehouse/repositories/warehouse-dispatch-repository";

export default async function DispatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("warehouse.view");
  const { id } = await params;

  const supabase = await createClient();
  const { data: record } = await supabase
    .from("warehouse_dispatch_records")
    .select("id, warehouse_id, destination_type, destination_reference, dispatched_by, dispatched_at, signature_url, status, notes")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (!record) notFound();
  const recordRow = record as WarehouseDispatchRow;

  const [{ data: lines }, { data: warehouse }, canUpload] = await Promise.all([
    supabase
      .from("warehouse_dispatch_lines")
      .select("id, dispatch_id, item_id, model_id, quantity, source_warehouse_location_id, dispatched")
      .eq("dispatch_id", id),
    supabase.from("warehouses").select("id, name").eq("id", recordRow.warehouse_id).maybeSingle(),
    hasPermission("warehouse.manage").then((v) => v || hasPermission("warehouse.dispatch")),
  ]);

  const lineRows = (lines ?? []) as WarehouseDispatchLineRow[];
  const itemIds = lineRows.filter((l) => l.item_id).map((l) => l.item_id as string);
  const modelIds = lineRows.filter((l) => l.model_id).map((l) => l.model_id as string);
  const locationIds = lineRows
    .filter((l) => l.source_warehouse_location_id)
    .map((l) => l.source_warehouse_location_id as string);

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
        <h1 className="text-2xl font-semibold tracking-tight">Dispatch</h1>
        <p className="text-muted-foreground text-sm">Pack and dispatch lines out of the warehouse.</p>
      </div>
      <DispatchDetail
        record={recordRow}
        lines={lineRows}
        warehouseName={warehouse?.name ?? "—"}
        itemLabels={itemLabels}
        modelLabels={modelLabels}
        locationCodes={locationCodes}
      />
      <Card>
        <CardHeader>
          <CardTitle>Documents &amp; signature</CardTitle>
        </CardHeader>
        <CardContent>
          <DocumentList relatedEntityType="dispatch" relatedEntityId={id} canUpload={canUpload} />
        </CardContent>
      </Card>
    </div>
  );
}
