"use server";

import { revalidatePath } from "next/cache";
import { runAction } from "@/modules/planning/shared/run-action";
import type { ActionResult } from "@/modules/warehouse/types/action-result";
import { planWorkflowService } from "@/modules/planning/services/plan-workflow-service";
import type { CancelPlanInput } from "@/modules/planning/schemas/workflow-schema";
import type { EquipmentPlanRow } from "@/modules/planning/repositories/equipment-plan-repository";
import type { EquipmentPlanVersionRow } from "@/modules/planning/repositories/equipment-plan-version-repository";

function revalidatePlan(planId: string) {
  revalidatePath("/planning");
  revalidatePath(`/planning/${planId}`);
}

export async function submitToReadyAction(planId: string): Promise<ActionResult<EquipmentPlanRow>> {
  const result = await runAction(() => planWorkflowService.submitToReady(planId));
  revalidatePlan(planId);
  return result;
}

export async function revertToPlanningAction(planId: string): Promise<ActionResult<EquipmentPlanRow>> {
  const result = await runAction(() => planWorkflowService.revertToPlanning(planId));
  revalidatePlan(planId);
  return result;
}

export async function approvePlanAction(planId: string): Promise<ActionResult<EquipmentPlanRow>> {
  const result = await runAction(() => planWorkflowService.approvePlan(planId));
  revalidatePlan(planId);
  return result;
}

export async function preparePlanAction(planId: string): Promise<ActionResult<EquipmentPlanRow>> {
  const result = await runAction(() => planWorkflowService.preparePlan(planId));
  revalidatePlan(planId);
  return result;
}

export async function loadPlanAction(planId: string): Promise<ActionResult<EquipmentPlanRow>> {
  const result = await runAction(() => planWorkflowService.loadPlan(planId));
  revalidatePlan(planId);
  return result;
}

export async function completePlanAction(planId: string): Promise<ActionResult<EquipmentPlanRow>> {
  const result = await runAction(() => planWorkflowService.completePlan(planId));
  revalidatePlan(planId);
  return result;
}

export async function cancelPlanAction(
  planId: string,
  input: CancelPlanInput
): Promise<ActionResult<EquipmentPlanRow>> {
  const result = await runAction(() => planWorkflowService.cancelPlan(planId, input));
  revalidatePlan(planId);
  return result;
}

export async function listPlanVersionsAction(
  planId: string
): Promise<ActionResult<EquipmentPlanVersionRow[]>> {
  return runAction(() => planWorkflowService.listVersions(planId));
}
