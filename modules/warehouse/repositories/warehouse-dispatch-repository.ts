import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { CreateDispatchInput } from "@/modules/warehouse/schemas/warehouse-dispatch-schema";

export type WarehouseDispatchRow = {
  id: string;
  warehouse_id: string;
  destination_type: string;
  destination_reference: string | null;
  dispatched_by: string | null;
  dispatched_at: string | null;
  signature_url: string | null;
  status: string;
  notes: string | null;
};

export type WarehouseDispatchLineRow = {
  id: string;
  dispatch_id: string;
  item_id: string | null;
  model_id: string | null;
  quantity: number | null;
  source_warehouse_location_id: string | null;
  dispatched: boolean;
};

const RECORD_COLUMNS =
  "id, warehouse_id, destination_type, destination_reference, dispatched_by, dispatched_at, signature_url, status, notes";
const LINE_COLUMNS = "id, dispatch_id, item_id, model_id, quantity, source_warehouse_location_id, dispatched";

export const warehouseDispatchRepository = {
  async findById(id: string): Promise<WarehouseDispatchRow | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("warehouse_dispatch_records")
      .select(RECORD_COLUMNS)
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async findLines(dispatchId: string): Promise<WarehouseDispatchLineRow[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("warehouse_dispatch_lines")
      .select(LINE_COLUMNS)
      .eq("dispatch_id", dispatchId);
    if (error) throw error;
    return data ?? [];
  },

  async createWithLines(
    input: CreateDispatchInput,
    userId: string
  ): Promise<{ record: WarehouseDispatchRow; lines: WarehouseDispatchLineRow[] }> {
    const supabase = await createClient();

    const { data: record, error: recordError } = await supabase
      .from("warehouse_dispatch_records")
      .insert({
        warehouse_id: input.warehouseId,
        destination_type: input.destinationType,
        destination_reference: input.destinationReference,
        notes: input.notes,
        created_by: userId,
        updated_by: userId,
      })
      .select(RECORD_COLUMNS)
      .single();
    if (recordError) throw recordError;

    const { data: lines, error: linesError } = await supabase
      .from("warehouse_dispatch_lines")
      .insert(
        input.lines.map((l) => ({
          dispatch_id: record.id,
          item_id: l.itemId,
          model_id: l.modelId,
          quantity: l.quantity,
          source_warehouse_location_id: l.sourceWarehouseLocationId,
        }))
      )
      .select(LINE_COLUMNS);
    if (linesError) throw linesError;

    return { record, lines: lines ?? [] };
  },

  async setSignatureUrl(dispatchId: string, signatureUrl: string, userId: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase
      .from("warehouse_dispatch_records")
      .update({ signature_url: signatureUrl, updated_by: userId })
      .eq("id", dispatchId);
    if (error) throw error;
  },

  async updateStatus(id: string, status: "cancelled", userId: string): Promise<WarehouseDispatchRow> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("warehouse_dispatch_records")
      .update({ status, updated_by: userId })
      .eq("id", id)
      .select(RECORD_COLUMNS)
      .single();
    if (error) throw error;
    return data;
  },

  // Transactional: dispatches one line's item/consumable via complete_warehouse_dispatch_line
  // (0040) — the sole path that touches equipment_items/consumable_stock_levels for a dispatch.
  async completeLineViaTransaction(lineId: string): Promise<WarehouseDispatchLineRow> {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("complete_warehouse_dispatch_line", {
      p_line_id: lineId,
    });
    if (error) throw error;
    return data;
  },

  // Read-only stock check used by DispatchService to validate quantity availability before
  // dispatching a consumable line.
  async findConsumableQuantityOnHand(modelId: string, storageLocationId: string): Promise<number> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("consumable_stock_levels")
      .select("quantity_on_hand")
      .eq("model_id", modelId)
      .eq("storage_location_id", storageLocationId)
      .maybeSingle();
    if (error) throw error;
    return data?.quantity_on_hand ?? 0;
  },
};
