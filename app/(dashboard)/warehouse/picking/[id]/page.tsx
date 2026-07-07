import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { PickListDetail } from "@/modules/warehouse/components/picking/pick-list-detail";
import type {
  WarehousePickListRow,
  WarehousePickListLineRow,
} from "@/modules/warehouse/repositories/warehouse-picking-repository";

export default async function PickListDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("warehouse.view");
  const { id } = await params;

  const supabase = await createClient();
  const { data: pickList } = await supabase
    .from("warehouse_pick_lists")
    .select("id, warehouse_id, method, status, assigned_to, created_by, completed_at")
    .eq("id", id)
    .maybeSingle();

  if (!pickList) notFound();
  const pickListRow = pickList as WarehousePickListRow;

  const [{ data: lines }, { data: warehouse }, { data: assignee }, { data: locations }] = await Promise.all([
    supabase.from("warehouse_pick_list_lines").select("id, pick_list_id, item_id, model_id, quantity, picked, picked_at").eq("pick_list_id", id),
    supabase.from("warehouses").select("id, name").eq("id", pickListRow.warehouse_id).maybeSingle(),
    pickListRow.assigned_to
      ? supabase.from("profiles").select("full_name").eq("id", pickListRow.assigned_to).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("warehouse_locations").select("id, full_code").eq("warehouse_id", pickListRow.warehouse_id).is("deleted_at", null).eq("is_placeable", true),
  ]);

  const lineRows = (lines ?? []) as WarehousePickListLineRow[];
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

  const itemLabels = Object.fromEntries((items ?? []).map((i) => [i.id, i.asset_tag]));
  const modelLabels = Object.fromEntries((models ?? []).map((m) => [m.id, m.model_name]));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Pick list</h1>
        <p className="text-muted-foreground text-sm">Picking progress and completion.</p>
      </div>
      <PickListDetail
        pickList={pickListRow}
        lines={lineRows}
        warehouseName={warehouse?.name ?? "—"}
        assignedToName={assignee?.full_name ?? null}
        itemLabels={itemLabels}
        modelLabels={modelLabels}
        locations={(locations ?? []).map((l) => ({ id: l.id, label: l.full_code ?? l.id }))}
      />
    </div>
  );
}
