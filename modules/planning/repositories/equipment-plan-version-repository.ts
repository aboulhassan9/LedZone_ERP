import "server-only";
import { createClient } from "@/lib/supabase/server";

export type EquipmentPlanVersionRow = {
  id: string;
  plan_id: string;
  version_number: number;
  status_at_version: string;
  snapshot_json: Record<string, unknown>;
  change_summary: string | null;
  created_at: string;
  created_by: string | null;
};

const COLUMNS =
  "id, plan_id, version_number, status_at_version, snapshot_json, change_summary, created_at, created_by";

// Writes happen inside each workflow RPC (0055) atomically alongside its status update -- this
// repository is read-only.
export const equipmentPlanVersionRepository = {
  async list(planId: string): Promise<EquipmentPlanVersionRow[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("equipment_plan_versions")
      .select(COLUMNS)
      .eq("plan_id", planId)
      .order("version_number", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
};
