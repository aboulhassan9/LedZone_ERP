"use server";

import { revalidatePath } from "next/cache";
import { runAction } from "@/modules/inventory/shared/run-action";
import type { ActionResult } from "@/modules/inventory/types/action-result";
import { consumableStockService } from "@/modules/inventory/services/consumable-stock-service";
import type { UpdateConsumableStockInput } from "@/modules/inventory/schemas/consumable-stock-schema";
import type { ConsumableStockMovementRow } from "@/modules/inventory/repositories/consumable-stock-repository";

export async function updateConsumableStockAction(
  input: UpdateConsumableStockInput
): Promise<ActionResult<ConsumableStockMovementRow>> {
  const result = await runAction(() => consumableStockService.updateConsumableStock(input));
  revalidatePath("/inventory/consumables");
  return result;
}
