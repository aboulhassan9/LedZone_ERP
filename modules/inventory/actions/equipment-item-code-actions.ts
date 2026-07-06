"use server";

import { revalidatePath } from "next/cache";
import { runAction } from "@/modules/inventory/shared/run-action";
import type { ActionResult } from "@/modules/inventory/types/action-result";
import { equipmentItemCodeService } from "@/modules/inventory/services/equipment-item-code-service";
import type { EquipmentItemCodeRow } from "@/modules/inventory/repositories/equipment-item-code-repository";

export async function assignQRCodeAction(itemId: string): Promise<ActionResult<EquipmentItemCodeRow>> {
  const result = await runAction(() => equipmentItemCodeService.assignQRCode(itemId));
  revalidatePath(`/inventory/items/${itemId}`);
  return result;
}

export async function assignBarcodeAction(itemId: string): Promise<ActionResult<EquipmentItemCodeRow>> {
  const result = await runAction(() => equipmentItemCodeService.assignBarcode(itemId));
  revalidatePath(`/inventory/items/${itemId}`);
  return result;
}
