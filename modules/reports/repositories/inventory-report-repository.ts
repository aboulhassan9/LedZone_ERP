import "server-only";
import { createClient } from "@/lib/supabase/server";

export type StatusBreakdownRow = { status: string; count: number };
export type ModelUtilizationRow = {
  modelId: string;
  modelName: string;
  totalItems: number;
  itemsOut: number;
  utilizationPct: number;
};

// "Out" = actively deployed, not sitting in a warehouse.
const OUT_STATUSES = new Set(["picked", "in_transit", "on_site", "in_use"]);

export const inventoryReportRepository = {
  async getStatusBreakdown(): Promise<StatusBreakdownRow[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("equipment_items")
      .select("current_status")
      .is("deleted_at", null);
    if (error) throw error;

    const counts = new Map<string, number>();
    for (const row of data ?? []) {
      counts.set(row.current_status, (counts.get(row.current_status) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count);
  },

  async getModelUtilization(): Promise<ModelUtilizationRow[]> {
    const supabase = await createClient();
    const [{ data: models, error: modelsError }, { data: items, error: itemsError }] = await Promise.all([
      supabase.from("equipment_models").select("id, model_name").is("deleted_at", null),
      supabase.from("equipment_items").select("model_id, current_status").is("deleted_at", null),
    ]);
    if (modelsError) throw modelsError;
    if (itemsError) throw itemsError;

    const totals = new Map<string, { total: number; out: number }>();
    for (const item of items ?? []) {
      const entry = totals.get(item.model_id) ?? { total: 0, out: 0 };
      entry.total += 1;
      if (OUT_STATUSES.has(item.current_status)) entry.out += 1;
      totals.set(item.model_id, entry);
    }

    return (models ?? [])
      .map((m) => {
        const entry = totals.get(m.id) ?? { total: 0, out: 0 };
        return {
          modelId: m.id,
          modelName: m.model_name,
          totalItems: entry.total,
          itemsOut: entry.out,
          utilizationPct: entry.total > 0 ? Math.round((entry.out / entry.total) * 100) : 0,
        };
      })
      .filter((m) => m.totalItems > 0)
      .sort((a, b) => b.utilizationPct - a.utilizationPct);
  },
};
