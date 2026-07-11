"use server";

import { revalidatePath } from "next/cache";
import { runAction } from "@/modules/inventory/shared/run-action";
import type { ActionResult } from "@/modules/inventory/types/action-result";
import { equipmentItemService } from "@/modules/inventory/services/equipment-item-service";
import type {
  CreateEquipmentItemInput,
  UpdateEquipmentItemInput,
  TransferEquipmentItemInput,
  CheckOutEquipmentItemInput,
  CheckInEquipmentItemInput,
  WarehouseItemMovementInput,
  BulkWarehouseMoveInput,
} from "@/modules/inventory/schemas/equipment-item-schema";
import type {
  EquipmentItemRow,
  EquipmentItemMovementRow,
} from "@/modules/inventory/repositories/equipment-item-repository";

function revalidateItem(id: string) {
  revalidatePath("/inventory/items");
  revalidatePath(`/inventory/items/${id}`);
}

export async function createEquipmentItemAction(
  input: CreateEquipmentItemInput
): Promise<ActionResult<EquipmentItemRow>> {
  const result = await runAction(() => equipmentItemService.createEquipmentItem(input));
  revalidatePath("/inventory/items");
  return result;
}

export async function updateEquipmentItemAction(
  id: string,
  input: UpdateEquipmentItemInput
): Promise<ActionResult<EquipmentItemRow>> {
  const result = await runAction(() => equipmentItemService.updateEquipmentItem(id, input));
  revalidateItem(id);
  return result;
}

export async function archiveEquipmentItemAction(id: string): Promise<ActionResult<void>> {
  const result = await runAction(() => equipmentItemService.archiveEquipmentItem(id));
  revalidateItem(id);
  return result;
}

export async function transferEquipmentItemAction(
  id: string,
  input: TransferEquipmentItemInput
): Promise<ActionResult<EquipmentItemMovementRow>> {
  const result = await runAction(() => equipmentItemService.transferEquipmentItem(id, input));
  revalidateItem(id);
  return result;
}

export async function checkOutEquipmentItemAction(
  id: string,
  input: CheckOutEquipmentItemInput
): Promise<ActionResult<EquipmentItemMovementRow>> {
  const result = await runAction(() => equipmentItemService.checkOutEquipmentItem(id, input));
  revalidateItem(id);
  return result;
}

export async function checkInEquipmentItemAction(
  id: string,
  input: CheckInEquipmentItemInput
): Promise<ActionResult<EquipmentItemMovementRow>> {
  const result = await runAction(() => equipmentItemService.checkInEquipmentItem(id, input));
  revalidateItem(id);
  return result;
}

// --- Warehouse-triggered movement types (Module 3) --------------------------------------

export async function putAwayEquipmentItemAction(
  id: string,
  input: WarehouseItemMovementInput
): Promise<ActionResult<EquipmentItemMovementRow>> {
  const result = await runAction(() => equipmentItemService.putAwayEquipmentItem(id, input));
  revalidateItem(id);
  return result;
}

export async function pickEquipmentItemAction(
  id: string,
  input: WarehouseItemMovementInput
): Promise<ActionResult<EquipmentItemMovementRow>> {
  const result = await runAction(() => equipmentItemService.pickEquipmentItem(id, input));
  revalidateItem(id);
  return result;
}

export async function quarantineEquipmentItemAction(
  id: string,
  input: WarehouseItemMovementInput
): Promise<ActionResult<EquipmentItemMovementRow>> {
  const result = await runAction(() => equipmentItemService.quarantineEquipmentItem(id, input));
  revalidateItem(id);
  return result;
}

export async function releaseFromQuarantineEquipmentItemAction(
  id: string,
  input: WarehouseItemMovementInput
): Promise<ActionResult<EquipmentItemMovementRow>> {
  const result = await runAction(() => equipmentItemService.releaseFromQuarantineEquipmentItem(id, input));
  revalidateItem(id);
  return result;
}

export async function scrapEquipmentItemAction(
  id: string,
  input: WarehouseItemMovementInput
): Promise<ActionResult<EquipmentItemMovementRow>> {
  const result = await runAction(() => equipmentItemService.scrapEquipmentItem(id, input));
  revalidateItem(id);
  return result;
}

export async function bulkMoveEquipmentItemsAction(
  input: BulkWarehouseMoveInput
): Promise<ActionResult<EquipmentItemMovementRow[]>> {
  const result = await runAction(() => equipmentItemService.bulkMoveEquipmentItems(input));
  revalidatePath("/inventory/items");
  return result;
}
