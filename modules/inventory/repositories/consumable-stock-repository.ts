import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { UpdateConsumableStockInput } from "@/modules/inventory/schemas/consumable-stock-schema";

export type ConsumableStockMovementRow = {
  id: string;
  model_id: string;
  storage_location_id: string;
  movement_type: string;
  quantity_delta: number;
  reference_note: string | null;
  moved_at: string;
};

export const consumableStockRepository = {
  // Transactional: upserts the stock level and appends the ledger movement atomically.
  async adjustViaTransaction(
    input: UpdateConsumableStockInput
  ): Promise<ConsumableStockMovementRow> {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("adjust_consumable_stock", {
      p_model_id: input.modelId,
      p_storage_location_id: input.storageLocationId,
      p_movement_type: input.movementType,
      p_quantity_delta: input.quantityDelta,
      p_unit_of_measure: input.unitOfMeasure,
      p_reference_note: input.referenceNote ?? null,
    });
    if (error) throw error;
    return data;
  },
};
