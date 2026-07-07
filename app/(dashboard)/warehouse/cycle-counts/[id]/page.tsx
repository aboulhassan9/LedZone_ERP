import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { CycleCountDetail } from "@/modules/warehouse/components/cycle-counts/cycle-count-detail";
import type {
  WarehouseCycleCountRow,
  WarehouseCycleCountLineRow,
} from "@/modules/warehouse/repositories/warehouse-cycle-count-repository";

export default async function CycleCountDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("warehouse.view");
  const { id } = await params;

  const supabase = await createClient();
  const { data: cycleCount } = await supabase
    .from("warehouse_cycle_counts")
    .select("id, warehouse_id, scope_type, scope_location_id, status, scheduled_date, started_at, completed_at, created_by, approved_by")
    .eq("id", id)
    .maybeSingle();

  if (!cycleCount) notFound();
  const cycleCountRow = cycleCount as WarehouseCycleCountRow;

  const [{ data: lines }, { data: warehouse }] = await Promise.all([
    supabase
      .from("warehouse_cycle_count_lines")
      .select("id, cycle_count_id, item_id, model_id, expected_qty, counted_qty, variance, adjustment_applied")
      .eq("cycle_count_id", id),
    supabase.from("warehouses").select("id, name").eq("id", cycleCountRow.warehouse_id).maybeSingle(),
  ]);

  const lineRows = (lines ?? []) as WarehouseCycleCountLineRow[];
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
        <h1 className="text-2xl font-semibold tracking-tight">Cycle count</h1>
        <p className="text-muted-foreground text-sm">Count session progress and difference report.</p>
      </div>
      <CycleCountDetail
        cycleCount={cycleCountRow}
        lines={lineRows}
        warehouseName={warehouse?.name ?? "—"}
        itemLabels={itemLabels}
        modelLabels={modelLabels}
      />
    </div>
  );
}
