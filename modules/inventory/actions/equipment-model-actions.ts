"use server";

import { revalidatePath } from "next/cache";
import { runAction } from "@/modules/inventory/shared/run-action";
import type { ActionResult } from "@/modules/inventory/types/action-result";
import { equipmentModelService } from "@/modules/inventory/services/equipment-model-service";
import type {
  CreateEquipmentModelInput,
  UpdateEquipmentModelInput,
  CreateConsumableInput,
} from "@/modules/inventory/schemas/equipment-model-schema";
import type { EquipmentModelRow } from "@/modules/inventory/repositories/equipment-model-repository";

export async function createEquipmentModelAction(
  input: CreateEquipmentModelInput
): Promise<ActionResult<EquipmentModelRow>> {
  const result = await runAction(() => equipmentModelService.createEquipmentModel(input));
  revalidatePath("/inventory/models");
  return result;
}

export async function createConsumableAction(
  input: CreateConsumableInput
): Promise<ActionResult<EquipmentModelRow>> {
  const result = await runAction(() => equipmentModelService.createConsumable(input));
  revalidatePath("/inventory/models");
  return result;
}

export async function updateEquipmentModelAction(
  id: string,
  input: UpdateEquipmentModelInput
): Promise<ActionResult<EquipmentModelRow>> {
  const result = await runAction(() => equipmentModelService.updateEquipmentModel(id, input));
  revalidatePath("/inventory/models");
  return result;
}

export async function archiveEquipmentModelAction(id: string): Promise<ActionResult<void>> {
  const result = await runAction(() => equipmentModelService.archiveEquipmentModel(id));
  revalidatePath("/inventory/models");
  return result;
}
