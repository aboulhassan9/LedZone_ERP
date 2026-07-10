import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { PlanConflict, PlanShortage } from "@/modules/planning/services/conflict-detection-service";

export type EquipmentConflictRow = {
  id: string;
  plan_id: string;
  plan_item_id: string | null;
  conflict_type: string;
  severity: string;
  conflicting_plan_id: string | null;
  description: string;
  detected_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
};

export type EquipmentShortageRow = {
  id: string;
  plan_id: string;
  plan_item_id: string;
  quantity_short: number;
  detected_at: string;
  resolved_at: string | null;
};

const CONFLICT_COLUMNS =
  "id, plan_id, plan_item_id, conflict_type, severity, conflicting_plan_id, description, detected_at, resolved_at, resolved_by";
const SHORTAGE_COLUMNS = "id, plan_id, plan_item_id, quantity_short, detected_at, resolved_at";

// ConflictDetectionService never calls this repository (it's read-only compute, see
// services/conflict-detection-service.ts) -- only EquipmentPlanService and PlanWorkflowService
// persist a freshly-computed result, via replaceForPlan.
export const equipmentConflictRepository = {
  // Delete-unresolved + insert-fresh, both tables, atomically -- see
  // supabase/migrations/0055_planning_workflow_functions.sql's replace_equipment_plan_conflicts.
  async replaceForPlan(
    planId: string,
    result: { conflicts: PlanConflict[]; shortages: PlanShortage[] }
  ): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.rpc("replace_equipment_plan_conflicts", {
      p_plan_id: planId,
      p_conflicts: result.conflicts.map((c) => ({
        plan_item_id: c.planItemId ?? null,
        conflict_type: c.conflictType,
        severity: c.severity,
        conflicting_plan_id: c.conflictingPlanId ?? null,
        description: c.description,
      })),
      p_shortages: result.shortages.map((s) => ({
        plan_item_id: s.planItemId,
        quantity_short: s.quantityShort,
      })),
    });
    if (error) throw error;
  },

  async findForPlan(planId: string): Promise<EquipmentConflictRow[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("equipment_conflicts")
      .select(CONFLICT_COLUMNS)
      .eq("plan_id", planId);
    if (error) throw error;
    return data ?? [];
  },

  async findUnresolvedBlocking(planId: string): Promise<EquipmentConflictRow[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("equipment_conflicts")
      .select(CONFLICT_COLUMNS)
      .eq("plan_id", planId)
      .eq("severity", "blocking")
      .is("resolved_at", null);
    if (error) throw error;
    return data ?? [];
  },

  async findUnresolvedShortages(planId: string): Promise<EquipmentShortageRow[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("equipment_shortages")
      .select(SHORTAGE_COLUMNS)
      .eq("plan_id", planId)
      .is("resolved_at", null);
    if (error) throw error;
    return data ?? [];
  },
};
