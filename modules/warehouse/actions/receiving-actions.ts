"use server";

import { revalidatePath } from "next/cache";
import { runAction } from "@/modules/warehouse/shared/run-action";
import type { ActionResult } from "@/modules/warehouse/types/action-result";
import { receivingService } from "@/modules/warehouse/services/receiving-service";
import type { CreateReceivingInput } from "@/modules/warehouse/schemas/warehouse-receiving-schema";
import type {
  WarehouseReceivingRow,
  WarehouseReceivingLineRow,
} from "@/modules/warehouse/repositories/warehouse-receiving-repository";

function revalidateReceiving(id?: string) {
  revalidatePath("/warehouse/receiving");
  if (id) revalidatePath(`/warehouse/receiving/${id}`);
}

export async function createReceivingAction(
  input: CreateReceivingInput
): Promise<ActionResult<{ record: WarehouseReceivingRow; lines: WarehouseReceivingLineRow[] }>> {
  const result = await runAction(() => receivingService.createReceiving(input));
  revalidateReceiving();
  return result;
}

export async function completeReceivingLineAction(
  lineId: string,
  receivingId: string
): Promise<ActionResult<WarehouseReceivingLineRow>> {
  const result = await runAction(() => receivingService.completeReceivingLine(lineId));
  revalidateReceiving(receivingId);
  return result;
}

export async function recordLineDamageAction(
  lineId: string,
  receivingId: string,
  input: { description: string; severity: "minor" | "major" | "critical"; repairCost?: number; currencyCode?: string }
): Promise<ActionResult<WarehouseReceivingLineRow>> {
  const result = await runAction(() => receivingService.recordLineDamage(lineId, input));
  revalidateReceiving(receivingId);
  return result;
}
