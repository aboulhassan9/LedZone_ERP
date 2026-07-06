"use server";

import { revalidatePath } from "next/cache";
import { runAction } from "@/modules/inventory/shared/run-action";
import type { ActionResult } from "@/modules/inventory/types/action-result";
import { purchaseService } from "@/modules/inventory/services/purchase-service";
import { warrantyService } from "@/modules/inventory/services/warranty-service";
import type { RegisterPurchaseInput, UpdatePurchaseInput } from "@/modules/inventory/schemas/purchase-schema";
import type { RegisterWarrantyInput, UpdateWarrantyInput } from "@/modules/inventory/schemas/warranty-schema";
import type { EquipmentPurchaseRow } from "@/modules/inventory/repositories/purchase-repository";
import type { EquipmentItemWarrantyRow } from "@/modules/inventory/repositories/warranty-repository";

export async function registerPurchaseAction(
  input: RegisterPurchaseInput
): Promise<ActionResult<EquipmentPurchaseRow>> {
  const result = await runAction(() => purchaseService.registerPurchase(input));
  revalidatePath("/inventory/purchases");
  return result;
}

export async function updatePurchaseAction(
  id: string,
  input: UpdatePurchaseInput
): Promise<ActionResult<EquipmentPurchaseRow>> {
  const result = await runAction(() => purchaseService.updatePurchase(id, input));
  revalidatePath("/inventory/purchases");
  return result;
}

export async function registerWarrantyAction(
  input: RegisterWarrantyInput
): Promise<ActionResult<EquipmentItemWarrantyRow>> {
  const result = await runAction(() => warrantyService.registerWarranty(input));
  revalidatePath(`/inventory/items/${input.itemId}`);
  return result;
}

export async function updateWarrantyAction(
  id: string,
  input: UpdateWarrantyInput
): Promise<ActionResult<EquipmentItemWarrantyRow>> {
  const result = await runAction(() => warrantyService.updateWarranty(id, input));
  revalidatePath("/inventory/items");
  return result;
}
