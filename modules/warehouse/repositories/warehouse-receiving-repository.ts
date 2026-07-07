import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { CreateReceivingInput } from "@/modules/warehouse/schemas/warehouse-receiving-schema";

export type WarehouseReceivingRow = {
  id: string;
  warehouse_id: string;
  source_type: string;
  purchase_id: string | null;
  reference_note: string | null;
  received_by: string | null;
  received_at: string;
  status: string;
};

export type WarehouseReceivingLineRow = {
  id: string;
  receiving_id: string;
  item_id: string | null;
  model_id: string | null;
  quantity: number | null;
  condition_on_arrival: string | null;
  damage_report_id: string | null;
  destination_warehouse_location_id: string | null;
  placed: boolean;
};

const RECORD_COLUMNS =
  "id, warehouse_id, source_type, purchase_id, reference_note, received_by, received_at, status";
const LINE_COLUMNS =
  "id, receiving_id, item_id, model_id, quantity, condition_on_arrival, damage_report_id, destination_warehouse_location_id, placed";

export const warehouseReceivingRepository = {
  async findById(id: string): Promise<WarehouseReceivingRow | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("warehouse_receiving_records")
      .select(RECORD_COLUMNS)
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async findLines(receivingId: string): Promise<WarehouseReceivingLineRow[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("warehouse_receiving_lines")
      .select(LINE_COLUMNS)
      .eq("receiving_id", receivingId);
    if (error) throw error;
    return data ?? [];
  },

  async findLineById(lineId: string): Promise<WarehouseReceivingLineRow | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("warehouse_receiving_lines")
      .select(LINE_COLUMNS)
      .eq("id", lineId)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async createWithLines(
    input: CreateReceivingInput,
    userId: string
  ): Promise<{ record: WarehouseReceivingRow; lines: WarehouseReceivingLineRow[] }> {
    const supabase = await createClient();

    const { data: record, error: recordError } = await supabase
      .from("warehouse_receiving_records")
      .insert({
        warehouse_id: input.warehouseId,
        source_type: input.sourceType,
        purchase_id: input.purchaseId,
        reference_note: input.referenceNote,
        received_by: userId,
        created_by: userId,
        updated_by: userId,
      })
      .select(RECORD_COLUMNS)
      .single();
    if (recordError) throw recordError;

    const { data: lines, error: linesError } = await supabase
      .from("warehouse_receiving_lines")
      .insert(
        input.lines.map((l) => ({
          receiving_id: record.id,
          item_id: l.itemId,
          model_id: l.modelId,
          quantity: l.quantity,
          condition_on_arrival: l.conditionOnArrival,
          destination_warehouse_location_id: l.destinationWarehouseLocationId,
        }))
      )
      .select(LINE_COLUMNS);
    if (linesError) throw linesError;

    return { record, lines: lines ?? [] };
  },

  async setLineDamageReport(lineId: string, damageReportId: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase
      .from("warehouse_receiving_lines")
      .update({ damage_report_id: damageReportId })
      .eq("id", lineId);
    if (error) throw error;
  },

  // Transactional: places one line's item/consumable via complete_warehouse_receiving_line
  // (0040) — the sole path that touches equipment_items/consumable_stock_levels for a receipt.
  async completeLineViaTransaction(lineId: string): Promise<WarehouseReceivingLineRow> {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("complete_warehouse_receiving_line", {
      p_line_id: lineId,
    });
    if (error) throw error;
    return data;
  },
};
