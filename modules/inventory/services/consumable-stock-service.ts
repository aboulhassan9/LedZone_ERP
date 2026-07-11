import "server-only";
import { assertPermission } from "@/modules/inventory/shared/authorize";
import { logInventoryAudit } from "@/modules/inventory/shared/audit";
import { ConflictError, toInventoryError } from "@/modules/inventory/errors";
import {
  updateConsumableStockSchema,
  type UpdateConsumableStockInput,
} from "@/modules/inventory/schemas/consumable-stock-schema";
import {
  consumableStockRepository,
  type ConsumableStockMovementRow,
} from "@/modules/inventory/repositories/consumable-stock-repository";

const DECREASING_TYPES = new Set(["consumed", "transferred_out"]);
const INCREASING_TYPES = new Set(["received", "transferred_in"]);

async function updateConsumableStock(
  input: UpdateConsumableStockInput
): Promise<ConsumableStockMovementRow> {
  await assertPermission("inventory.manage");
  const parsed = updateConsumableStockSchema.parse(input);

  // Business rule: the sign of the quantity change must match the movement type's
  // direction — "received" can't carry a negative delta, "consumed" can't carry positive.
  if (DECREASING_TYPES.has(parsed.movementType) && parsed.quantityDelta > 0) {
    throw new ConflictError(`Movement type "${parsed.movementType}" must have a negative quantity.`);
  }
  if (INCREASING_TYPES.has(parsed.movementType) && parsed.quantityDelta < 0) {
    throw new ConflictError(`Movement type "${parsed.movementType}" must have a positive quantity.`);
  }

  try {
    const movement = await consumableStockRepository.adjustViaTransaction(parsed);
    await logInventoryAudit(
      "consumable_stock.adjusted",
      "consumable_stock_levels",
      parsed.modelId,
      { movementType: parsed.movementType, quantityDelta: parsed.quantityDelta }
    );
    return movement;
  } catch (error) {
    // The quantity_on_hand >= 0 check constraint surfaces here as a Postgres error when a
    // consumption would go negative — translate it into a clear ConflictError.
    const pgError = error as { message?: string } | null;
    if (pgError?.message?.includes("quantity_on_hand")) {
      throw new ConflictError("This movement would make the stock level negative.");
    }
    throw toInventoryError(error, "Consumable stock");
  }
}

export const consumableStockService = { updateConsumableStock };
