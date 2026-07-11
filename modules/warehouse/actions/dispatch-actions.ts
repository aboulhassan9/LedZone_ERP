"use server";

import { revalidatePath } from "next/cache";
import { runAction } from "@/modules/warehouse/shared/run-action";
import type { ActionResult } from "@/modules/warehouse/types/action-result";
import { dispatchService } from "@/modules/warehouse/services/dispatch-service";
import type { CreateDispatchInput } from "@/modules/warehouse/schemas/warehouse-dispatch-schema";
import type {
  WarehouseDispatchRow,
  WarehouseDispatchLineRow,
} from "@/modules/warehouse/repositories/warehouse-dispatch-repository";

function revalidateDispatch(id?: string) {
  revalidatePath("/warehouse/dispatch");
  if (id) revalidatePath(`/warehouse/dispatch/${id}`);
}

export async function createDispatchAction(
  input: CreateDispatchInput
): Promise<ActionResult<{ record: WarehouseDispatchRow; lines: WarehouseDispatchLineRow[] }>> {
  const result = await runAction(() => dispatchService.createDispatch(input));
  revalidateDispatch();
  return result;
}

export async function completeDispatchLineAction(
  dispatchId: string,
  lineId: string
): Promise<ActionResult<WarehouseDispatchLineRow>> {
  const result = await runAction(() => dispatchService.completeDispatchLine(dispatchId, lineId));
  revalidateDispatch(dispatchId);
  return result;
}

export async function attachSignatureAction(
  dispatchId: string,
  signatureUrl: string
): Promise<ActionResult<void>> {
  const result = await runAction(() => dispatchService.attachSignature(dispatchId, signatureUrl));
  revalidateDispatch(dispatchId);
  return result;
}
