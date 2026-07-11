"use server";

import { revalidatePath } from "next/cache";
import { runAction } from "@/modules/inventory/shared/run-action";
import type { ActionResult } from "@/modules/inventory/types/action-result";
import { depreciationService } from "@/modules/inventory/services/depreciation-service";
import type {
  SetDepreciationPolicyInput,
  UpdateDepreciationPolicyInput,
} from "@/modules/inventory/schemas/depreciation-schema";
import type { EquipmentDepreciationPolicyRow } from "@/modules/inventory/repositories/depreciation-repository";

export async function setDepreciationPolicyAction(
  input: SetDepreciationPolicyInput
): Promise<ActionResult<EquipmentDepreciationPolicyRow>> {
  const result = await runAction(() => depreciationService.setDepreciationPolicy(input));
  revalidatePath(`/inventory/items/${input.itemId}`);
  return result;
}

export async function updateDepreciationPolicyAction(
  itemId: string,
  input: UpdateDepreciationPolicyInput
): Promise<ActionResult<EquipmentDepreciationPolicyRow>> {
  const result = await runAction(() => depreciationService.updateDepreciationPolicy(itemId, input));
  revalidatePath(`/inventory/items/${itemId}`);
  return result;
}
