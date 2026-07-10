import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { PlanDetail } from "@/modules/planning/components/plans/plan-detail";
import type { EquipmentPlanRow, EquipmentPlanItemRow } from "@/modules/planning/repositories/equipment-plan-repository";
import type { EquipmentConflictRow, EquipmentShortageRow } from "@/modules/planning/repositories/equipment-conflict-repository";
import type { ResourceAssignmentRow, CrewMemberRow, VehicleRow } from "@/modules/planning/repositories/resource-assignment-repository";
import type { WarehouseRow } from "@/modules/warehouse/repositories/warehouse-repository";

const PLAN_COLUMNS =
  "id, name, event_start_at, event_end_at, customer_reference, event_reference, status, primary_warehouse_id, notes, approved_by, approved_at, created_at, updated_at";

export default async function PlanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("planning.view");
  const { id } = await params;

  const supabase = await createClient();
  const { data: plan } = await supabase
    .from("equipment_plans")
    .select(PLAN_COLUMNS)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (!plan) notFound();
  const planRow = plan as EquipmentPlanRow;

  const [
    { data: items },
    { data: conflicts },
    { data: shortages },
    { data: assignments },
    { data: crewMembers },
    { data: vehicles },
    { data: models },
    { data: warehouses },
  ] = await Promise.all([
    supabase
      .from("equipment_plan_items")
      .select("id, plan_id, model_id, quantity_requested, warehouse_id, notes, created_at, updated_at")
      .eq("plan_id", id),
    supabase
      .from("equipment_conflicts")
      .select("id, plan_id, plan_item_id, conflict_type, severity, conflicting_plan_id, description, detected_at, resolved_at, resolved_by")
      .eq("plan_id", id),
    supabase
      .from("equipment_shortages")
      .select("id, plan_id, plan_item_id, quantity_short, detected_at, resolved_at")
      .eq("plan_id", id),
    supabase
      .from("resource_assignments")
      .select("id, plan_id, resource_type, crew_member_id, vehicle_id, role_or_purpose, scheduled_start_at, scheduled_end_at, notes")
      .eq("plan_id", id),
    supabase.from("crew_members").select("id, full_name, role, phone, email, is_active").is("deleted_at", null).eq("is_active", true),
    supabase.from("vehicles").select("id, name, plate_number, vehicle_type, capacity_notes, is_active").is("deleted_at", null).eq("is_active", true),
    supabase.from("equipment_models").select("id, model_name").is("deleted_at", null).eq("status", "active").order("model_name"),
    supabase.from("warehouses").select("id, name, code").is("deleted_at", null).order("name"),
  ]);

  const warehouseRows = (warehouses ?? []) as Pick<WarehouseRow, "id" | "name" | "code">[];
  const warehouseNames = Object.fromEntries(warehouseRows.map((w) => [w.id, w.name]));
  const modelRows = (models ?? []) as { id: string; model_name: string }[];
  const modelNames = Object.fromEntries(modelRows.map((m) => [m.id, m.model_name]));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Equipment plan</h1>
        <p className="text-muted-foreground text-sm">Draft → Planning → Ready → Approved → Prepared → Loaded → Completed.</p>
      </div>
      <PlanDetail
        plan={planRow}
        items={(items ?? []) as EquipmentPlanItemRow[]}
        conflicts={(conflicts ?? []) as EquipmentConflictRow[]}
        shortages={(shortages ?? []) as EquipmentShortageRow[]}
        assignments={(assignments ?? []) as ResourceAssignmentRow[]}
        crewMembers={(crewMembers ?? []) as CrewMemberRow[]}
        vehicles={(vehicles ?? []) as VehicleRow[]}
        models={modelRows.map((m) => ({ id: m.id, label: m.model_name }))}
        warehouses={warehouseRows as WarehouseRow[]}
        modelNames={modelNames}
        warehouseNames={warehouseNames}
      />
    </div>
  );
}
