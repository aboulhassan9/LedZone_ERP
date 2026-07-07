import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { CreateTransferRequestInput } from "@/modules/warehouse/schemas/warehouse-transfer-schema";

export type WarehouseTransferRow = {
  id: string;
  from_warehouse_id: string;
  to_warehouse_id: string;
  from_location_id: string | null;
  to_location_id: string | null;
  status: string;
  requested_by: string | null;
  approved_by: string | null;
  requested_at: string;
  approved_at: string | null;
  completed_at: string | null;
  notes: string | null;
};

export type WarehouseTransferLineRow = {
  id: string;
  transfer_id: string;
  item_id: string | null;
  model_id: string | null;
  quantity: number | null;
  status: string;
};

const TRANSFER_COLUMNS =
  "id, from_warehouse_id, to_warehouse_id, from_location_id, to_location_id, status, requested_by, approved_by, requested_at, approved_at, completed_at, notes";
const LINE_COLUMNS = "id, transfer_id, item_id, model_id, quantity, status";

export const warehouseTransferRepository = {
  async findById(id: string): Promise<WarehouseTransferRow | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("warehouse_transfers")
      .select(TRANSFER_COLUMNS)
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async findLines(transferId: string): Promise<WarehouseTransferLineRow[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("warehouse_transfer_lines")
      .select(LINE_COLUMNS)
      .eq("transfer_id", transferId);
    if (error) throw error;
    return data ?? [];
  },

  // Header + lines in two calls (Supabase-JS can't span one client transaction across
  // multiple statements) — acceptable here because both inserts are 'pending' rows with no
  // side effects on equipment/consumables yet; nothing observable happens until approve/
  // execute, which DO go through single-transaction RPCs.
  async createWithLines(
    input: CreateTransferRequestInput,
    userId: string
  ): Promise<{ transfer: WarehouseTransferRow; lines: WarehouseTransferLineRow[] }> {
    const supabase = await createClient();

    const { data: transfer, error: transferError } = await supabase
      .from("warehouse_transfers")
      .insert({
        from_warehouse_id: input.fromWarehouseId,
        to_warehouse_id: input.toWarehouseId,
        from_location_id: input.fromLocationId,
        to_location_id: input.toLocationId,
        notes: input.notes,
        requested_by: userId,
        created_by: userId,
        updated_by: userId,
      })
      .select(TRANSFER_COLUMNS)
      .single();
    if (transferError) throw transferError;

    const { data: lines, error: linesError } = await supabase
      .from("warehouse_transfer_lines")
      .insert(
        input.lines.map((l) => ({
          transfer_id: transfer.id,
          item_id: l.itemId,
          model_id: l.modelId,
          quantity: l.quantity,
        }))
      )
      .select(LINE_COLUMNS);
    if (linesError) throw linesError;

    return { transfer, lines: lines ?? [] };
  },

  async updateStatus(
    id: string,
    status: "submitted" | "rejected" | "cancelled" | "failed",
    userId: string,
    notes?: string
  ): Promise<WarehouseTransferRow> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("warehouse_transfers")
      .update({ status, notes, updated_by: userId })
      .eq("id", id)
      .select(TRANSFER_COLUMNS)
      .single();
    if (error) throw error;
    return data;
  },

  async updateLineStatus(id: string, status: "cancelled"): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("warehouse_transfer_lines").update({ status }).eq("id", id);
    if (error) throw error;
  },

  // Transactional: approves the header via approve_warehouse_transfer (0040).
  async approveViaTransaction(id: string): Promise<WarehouseTransferRow> {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("approve_warehouse_transfer", { p_transfer_id: id });
    if (error) throw error;
    return data;
  },

  // Transactional: moves one line's item/consumable quantity via complete_warehouse_transfer_line
  // (0040) — the sole path that touches equipment_items/consumable_stock_levels for a transfer.
  async completeLineViaTransaction(lineId: string): Promise<WarehouseTransferLineRow> {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("complete_warehouse_transfer_line", {
      p_line_id: lineId,
    });
    if (error) throw error;
    return data;
  },
};
