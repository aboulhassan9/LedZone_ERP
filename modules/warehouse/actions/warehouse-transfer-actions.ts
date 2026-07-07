"use server";

import { revalidatePath } from "next/cache";
import { runAction } from "@/modules/warehouse/shared/run-action";
import type { ActionResult } from "@/modules/warehouse/types/action-result";
import { warehouseTransferService } from "@/modules/warehouse/services/warehouse-transfer-service";
import type {
  CreateTransferRequestInput,
  RejectTransferInput,
  CancelTransferInput,
} from "@/modules/warehouse/schemas/warehouse-transfer-schema";
import type {
  WarehouseTransferRow,
  WarehouseTransferLineRow,
} from "@/modules/warehouse/repositories/warehouse-transfer-repository";

function revalidateTransfers(id?: string) {
  revalidatePath("/warehouse/transfers");
  if (id) revalidatePath(`/warehouse/transfers/${id}`);
}

export async function createTransferRequestAction(
  input: CreateTransferRequestInput
): Promise<ActionResult<{ transfer: WarehouseTransferRow; lines: WarehouseTransferLineRow[] }>> {
  const result = await runAction(() => warehouseTransferService.createTransferRequest(input));
  revalidateTransfers();
  return result;
}

export async function approveTransferAction(id: string): Promise<ActionResult<WarehouseTransferRow>> {
  const result = await runAction(() => warehouseTransferService.approveTransfer(id));
  revalidateTransfers(id);
  return result;
}

export async function rejectTransferAction(
  id: string,
  input: RejectTransferInput
): Promise<ActionResult<WarehouseTransferRow>> {
  const result = await runAction(() => warehouseTransferService.rejectTransfer(id, input));
  revalidateTransfers(id);
  return result;
}

export async function cancelTransferAction(
  id: string,
  input: CancelTransferInput
): Promise<ActionResult<WarehouseTransferRow>> {
  const result = await runAction(() => warehouseTransferService.cancelTransfer(id, input));
  revalidateTransfers(id);
  return result;
}

export async function executeTransferAction(
  id: string
): Promise<ActionResult<{ transfer: WarehouseTransferRow; lines: WarehouseTransferLineRow[] }>> {
  const result = await runAction(() => warehouseTransferService.executeTransfer(id));
  revalidateTransfers(id);
  return result;
}
