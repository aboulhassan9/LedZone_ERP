import "server-only";
import { createClient } from "@/lib/supabase/server";

export type EquipmentPlanItemAssignmentRow = {
  id: string;
  plan_item_id: string;
  item_id: string;
  warehouse_reservation_id: string | null;
  assigned_at: string;
  assigned_by: string | null;
};

const COLUMNS = "id, plan_item_id, item_id, warehouse_reservation_id, assigned_at, assigned_by";

// Writes happen inside prepare_equipment_plan (0055) -- this repository only offers read
// helpers, no write methods, since Prepare's write is atomic-by-necessity (see
// PlanWorkflowService.preparePlan).
export const equipmentPlanAssignmentRepository = {
  async findByPlanItem(planItemId: string): Promise<EquipmentPlanItemAssignmentRow[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("equipment_plan_item_assignments")
      .select(COLUMNS)
      .eq("plan_item_id", planItemId);
    if (error) throw error;
    return data ?? [];
  },

  async findByPlan(planId: string): Promise<
    (EquipmentPlanItemAssignmentRow & { current_status: string; asset_tag: string })[]
  > {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("equipment_plan_item_assignments")
      .select(
        `${COLUMNS}, item:equipment_items!inner(current_status, asset_tag), plan_item:equipment_plan_items!inner(plan_id)`
      )
      .eq("plan_item.plan_id", planId);
    if (error) throw error;
    return (data ?? []).map((row) => {
      const r = row as unknown as EquipmentPlanItemAssignmentRow & {
        item: { current_status: string; asset_tag: string };
      };
      return { ...r, current_status: r.item.current_status, asset_tag: r.item.asset_tag };
    });
  },
};
