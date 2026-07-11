import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { CreatePickListInput } from "@/modules/warehouse/schemas/warehouse-picking-schema";

export type WarehousePickListRow = {
  id: string;
  warehouse_id: string;
  method: string;
  status: string;
  assigned_to: string | null;
  created_by: string | null;
  completed_at: string | null;
};

export type WarehousePickListLineRow = {
  id: string;
  pick_list_id: string;
  item_id: string | null;
  model_id: string | null;
  quantity: number | null;
  picked: boolean;
  picked_at: string | null;
};

const LIST_COLUMNS = "id, warehouse_id, method, status, assigned_to, created_by, completed_at";
const LINE_COLUMNS = "id, pick_list_id, item_id, model_id, quantity, picked, picked_at";

export const warehousePickingRepository = {
  async findById(id: string): Promise<WarehousePickListRow | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("warehouse_pick_lists")
      .select(LIST_COLUMNS)
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async findLines(pickListId: string): Promise<WarehousePickListLineRow[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("warehouse_pick_list_lines")
      .select(LINE_COLUMNS)
      .eq("pick_list_id", pickListId);
    if (error) throw error;
    return data ?? [];
  },

  async findLineById(lineId: string): Promise<WarehousePickListLineRow | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("warehouse_pick_list_lines")
      .select(LINE_COLUMNS)
      .eq("id", lineId)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async createWithLines(
    input: CreatePickListInput,
    userId: string
  ): Promise<{ pickList: WarehousePickListRow; lines: WarehousePickListLineRow[] }> {
    const supabase = await createClient();

    const { data: pickList, error: listError } = await supabase
      .from("warehouse_pick_lists")
      .insert({
        warehouse_id: input.warehouseId,
        method: input.method,
        assigned_to: input.assignedTo,
        created_by: userId,
      })
      .select(LIST_COLUMNS)
      .single();
    if (listError) throw listError;

    const { data: lines, error: linesError } = await supabase
      .from("warehouse_pick_list_lines")
      .insert(
        input.lines.map((l) => ({
          pick_list_id: pickList.id,
          item_id: l.itemId,
          model_id: l.modelId,
          quantity: l.quantity,
        }))
      )
      .select(LINE_COLUMNS);
    if (linesError) throw linesError;

    return { pickList, lines: lines ?? [] };
  },

  async markLinePicked(lineId: string): Promise<WarehousePickListLineRow> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("warehouse_pick_list_lines")
      .update({ picked: true, picked_at: new Date().toISOString() })
      .eq("id", lineId)
      .select(LINE_COLUMNS)
      .single();
    if (error) throw error;
    return data;
  },

  async updateStatus(
    id: string,
    status: "in_progress" | "completed" | "cancelled"
  ): Promise<WarehousePickListRow> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("warehouse_pick_lists")
      .update({ status, completed_at: status === "completed" ? new Date().toISOString() : null })
      .eq("id", id)
      .select(LIST_COLUMNS)
      .single();
    if (error) throw error;
    return data;
  },
};
