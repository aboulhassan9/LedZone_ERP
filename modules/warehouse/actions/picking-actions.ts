"use server";

import { revalidatePath } from "next/cache";
import { runAction } from "@/modules/warehouse/shared/run-action";
import type { ActionResult } from "@/modules/warehouse/types/action-result";
import { pickingService } from "@/modules/warehouse/services/picking-service";
import type { CreatePickListInput, CompletePickLineInput } from "@/modules/warehouse/schemas/warehouse-picking-schema";
import type {
  WarehousePickListRow,
  WarehousePickListLineRow,
} from "@/modules/warehouse/repositories/warehouse-picking-repository";

function revalidatePicking(id?: string) {
  revalidatePath("/warehouse/picking");
  if (id) revalidatePath(`/warehouse/picking/${id}`);
}

export async function createPickListAction(
  input: CreatePickListInput
): Promise<ActionResult<{ pickList: WarehousePickListRow; lines: WarehousePickListLineRow[] }>> {
  const result = await runAction(() => pickingService.createPickList(input));
  revalidatePicking();
  return result;
}

export async function completePickLineAction(
  lineId: string,
  pickListId: string,
  input: CompletePickLineInput
): Promise<ActionResult<WarehousePickListLineRow>> {
  const result = await runAction(() => pickingService.completePickLine(lineId, input));
  revalidatePicking(pickListId);
  return result;
}

export async function startPickListAction(id: string): Promise<ActionResult<WarehousePickListRow>> {
  const result = await runAction(() => pickingService.startPickList(id));
  revalidatePicking(id);
  return result;
}
