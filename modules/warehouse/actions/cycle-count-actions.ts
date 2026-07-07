"use server";

import { revalidatePath } from "next/cache";
import { runAction } from "@/modules/warehouse/shared/run-action";
import type { ActionResult } from "@/modules/warehouse/types/action-result";
import { cycleCountService } from "@/modules/warehouse/services/cycle-count-service";
import type {
  CreateCycleCountInput,
  RecordCountInput,
} from "@/modules/warehouse/schemas/warehouse-cycle-count-schema";
import type {
  WarehouseCycleCountRow,
  WarehouseCycleCountLineRow,
} from "@/modules/warehouse/repositories/warehouse-cycle-count-repository";

function revalidateCycleCounts(id?: string) {
  revalidatePath("/warehouse/cycle-counts");
  if (id) revalidatePath(`/warehouse/cycle-counts/${id}`);
}

export async function createCycleCountAction(
  input: CreateCycleCountInput
): Promise<ActionResult<{ cycleCount: WarehouseCycleCountRow; lines: WarehouseCycleCountLineRow[] }>> {
  const result = await runAction(() => cycleCountService.createCycleCount(input));
  revalidateCycleCounts();
  return result;
}

export async function startCycleCountAction(id: string): Promise<ActionResult<WarehouseCycleCountRow>> {
  const result = await runAction(() => cycleCountService.startCycleCount(id));
  revalidateCycleCounts(id);
  return result;
}

export async function recordCountAction(
  lineId: string,
  cycleCountId: string,
  input: RecordCountInput
): Promise<ActionResult<WarehouseCycleCountLineRow>> {
  const result = await runAction(() => cycleCountService.recordCount(lineId, input));
  revalidateCycleCounts(cycleCountId);
  return result;
}

export async function submitForApprovalAction(id: string): Promise<ActionResult<WarehouseCycleCountRow>> {
  const result = await runAction(() => cycleCountService.submitForApproval(id));
  revalidateCycleCounts(id);
  return result;
}

export async function approveCycleCountAction(id: string): Promise<ActionResult<WarehouseCycleCountRow>> {
  const result = await runAction(() => cycleCountService.approveCycleCount(id));
  revalidateCycleCounts(id);
  return result;
}
