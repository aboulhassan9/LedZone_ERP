import { requirePermission } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { PlanTable } from "@/modules/planning/components/plans/plan-table";
import { PlanCreateDialog } from "@/modules/planning/components/plans/plan-create-dialog";
import type { EquipmentPlanRow } from "@/modules/planning/repositories/equipment-plan-repository";
import type { WarehouseRow } from "@/modules/warehouse/repositories/warehouse-repository";

const PLAN_COLUMNS =
  "id, name, event_start_at, event_end_at, customer_id, event_id, status, primary_warehouse_id, notes, approved_by, approved_at, created_at, updated_at";

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

  const [{ data: plans }, { data: warehouses }, { data: customers }, { data: events }] = await Promise.all([
    query.order("event_start_at", { ascending: true }),
    supabase.from("warehouses").select("id, name, code").is("deleted_at", null).order("name"),
    supabase.from("customers").select("id, company_name, full_name").is("deleted_at", null).order("company_name"),
    supabase.from("events").select("id, name").is("deleted_at", null).order("event_start_at", { ascending: false }),
  ]);

  const warehouseRows = (warehouses ?? []) as Pick<WarehouseRow, "id" | "name" | "code">[];
  const warehouseNames = Object.fromEntries(warehouseRows.map((w) => [w.id, w.name]));
  const customerRows = customers ?? [];
  const customerNames = Object.fromEntries(
    customerRows.map((c) => [c.id, c.company_name ?? c.full_name ?? "—"])
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Equipment plans</h1>
          <p className="text-muted-foreground text-sm">Model-level demand for events, refined before any warehouse operation begins.</p>
        </div>
        <PlanCreateDialog
          warehouses={warehouseRows as WarehouseRow[]}
          customers={customerRows.map((c) => ({ id: c.id, label: c.company_name ?? c.full_name ?? "—" }))}
          events={(events ?? []).map((e) => ({ id: e.id, label: e.name }))}
        />
      </div>
      <PlanTable
        plans={(plans ?? []) as EquipmentPlanRow[]}
        warehouseNames={warehouseNames}
        customerNames={customerNames}
      />
    </div>
  );
}
