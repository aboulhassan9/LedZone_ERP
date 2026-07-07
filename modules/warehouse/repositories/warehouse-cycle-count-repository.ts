import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { CreateCycleCountInput } from "@/modules/warehouse/schemas/warehouse-cycle-count-schema";

export type WarehouseCycleCountRow = {
  id: string;
  warehouse_id: string;
  scope_type: string;
  scope_location_id: string | null;
  status: string;
  scheduled_date: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_by: string | null;
  approved_by: string | null;
};

export type WarehouseCycleCountLineRow = {
  id: string;
  cycle_count_id: string;
  item_id: string | null;
  model_id: string | null;
  expected_qty: number;
  counted_qty: number | null;
  variance: number | null;
  adjustment_applied: boolean;
};

const COUNT_COLUMNS =
  "id, warehouse_id, scope_type, scope_location_id, status, scheduled_date, started_at, completed_at, created_by, approved_by";
const LINE_COLUMNS =
  "id, cycle_count_id, item_id, model_id, expected_qty, counted_qty, variance, adjustment_applied";

export const warehouseCycleCountRepository = {
  async findById(id: string): Promise<WarehouseCycleCountRow | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("warehouse_cycle_counts")
      .select(COUNT_COLUMNS)
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async findLines(cycleCountId: string): Promise<WarehouseCycleCountLineRow[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("warehouse_cycle_count_lines")
      .select(LINE_COLUMNS)
      .eq("cycle_count_id", cycleCountId);
    if (error) throw error;
    return data ?? [];
  },

  async findLineById(lineId: string): Promise<WarehouseCycleCountLineRow | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("warehouse_cycle_count_lines")
      .select(LINE_COLUMNS)
      .eq("id", lineId)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async createWithLines(
    input: CreateCycleCountInput,
    userId: string
  ): Promise<{ cycleCount: WarehouseCycleCountRow; lines: WarehouseCycleCountLineRow[] }> {
    const supabase = await createClient();

    const { data: cycleCount, error: countError } = await supabase
      .from("warehouse_cycle_counts")
      .insert({
        warehouse_id: input.warehouseId,
        scope_type: input.scopeType,
        scope_location_id: input.scopeLocationId,
        scheduled_date: input.scheduledDate,
        created_by: userId,
      })
      .select(COUNT_COLUMNS)
      .single();
    if (countError) throw countError;

    const { data: lines, error: linesError } = await supabase
      .from("warehouse_cycle_count_lines")
      .insert(
        input.lines.map((l) => ({
          cycle_count_id: cycleCount.id,
          item_id: l.itemId,
          model_id: l.modelId,
          expected_qty: l.expectedQty,
        }))
      )
      .select(LINE_COLUMNS);
    if (linesError) throw linesError;

    return { cycleCount, lines: lines ?? [] };
  },

  async recordLineCount(lineId: string, countedQty: number): Promise<WarehouseCycleCountLineRow> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("warehouse_cycle_count_lines")
      .update({ counted_qty: countedQty })
      .eq("id", lineId)
      .select(LINE_COLUMNS)
      .single();
    if (error) throw error;
    return data;
  },

  async updateStatus(
    id: string,
    status: "in_progress" | "pending_approval" | "approved" | "cancelled",
    userId: string
  ): Promise<WarehouseCycleCountRow> {
    const supabase = await createClient();
    const patch: Record<string, unknown> = { status };
    if (status === "in_progress") patch.started_at = new Date().toISOString();
    if (status === "approved") {
      patch.completed_at = new Date().toISOString();
      patch.approved_by = userId;
    }
    const { data, error } = await supabase
      .from("warehouse_cycle_counts")
      .update(patch)
      .eq("id", id)
      .select(COUNT_COLUMNS)
      .single();
    if (error) throw error;
    return data;
  },

  // Transactional: applies one line's variance to consumable stock via
  // apply_warehouse_cycle_count_adjustment (0040) — the sole path that touches
  // consumable_stock_levels for a cycle count.
  async applyAdjustmentViaTransaction(lineId: string): Promise<WarehouseCycleCountLineRow> {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("apply_warehouse_cycle_count_adjustment", {
      p_line_id: lineId,
    });
    if (error) throw error;
    return data;
  },
};
