import { requirePermission } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { PlanTable } from "@/modules/planning/components/plans/plan-table";
import { PlanCreateDialog } from "@/modules/planning/components/plans/plan-create-dialog";
import type { EquipmentPlanRow } from "@/modules/planning/repositories/equipment-plan-repository";
import type { WarehouseRow } from "@/modules/warehouse/repositories/warehouse-repository";

const PLAN_COLUMNS =
  "id, name, event_start_at, event_end_at, customer_reference, event_reference, status, primary_warehouse_id, notes, approved_by, approved_at, created_at, updated_at";

export default async function PlansPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requirePermission("planning.view");
  const { status } = await searchParams;

  const supabase = await createClient();
  let query = supabase.from("equipment_plans").select(PLAN_COLUMNS).is("deleted_at", null);
  if (status) query = query.eq("status", status);

  const [{ data: plans }, { data: warehouses }] = await Promise.all([
    query.order("event_start_at", { ascending: true }),
    supabase.from("warehouses").select("id, name, code").is("deleted_at", null).order("name"),
  ]);

  const warehouseRows = (warehouses ?? []) as Pick<WarehouseRow, "id" | "name" | "code">[];
  const warehouseNames = Object.fromEntries(warehouseRows.map((w) => [w.id, w.name]));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Equipment plans</h1>
          <p className="text-muted-foreground text-sm">Model-level demand for events, refined before any warehouse operation begins.</p>
        </div>
        <PlanCreateDialog warehouses={warehouseRows as WarehouseRow[]} />
      </div>
      <PlanTable plans={(plans ?? []) as EquipmentPlanRow[]} warehouseNames={warehouseNames} />
    </div>
  );
}
