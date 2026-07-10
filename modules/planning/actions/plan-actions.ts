"use server";

import { revalidatePath } from "next/cache";
import { runAction } from "@/modules/planning/shared/run-action";
import type { ActionResult } from "@/modules/warehouse/types/action-result";
import { equipmentPlanService } from "@/modules/planning/services/equipment-plan-service";
import { availabilityService, type AvailabilityRequest, type AvailabilityResult } from "@/modules/planning/services/availability-service";
import { assertAnyPermission } from "@/modules/planning/shared/authorize";
import type {
  CreateEquipmentPlanInput,
  UpdateEquipmentPlanInput,
  ListEquipmentPlansInput,
} from "@/modules/planning/schemas/equipment-plan-schema";
import type { CreatePlanItemInput, UpdatePlanItemInput } from "@/modules/planning/schemas/plan-item-schema";
import type { EquipmentPlanRow, EquipmentPlanItemRow } from "@/modules/planning/repositories/equipment-plan-repository";

function revalidatePlans(planId?: string) {
  revalidatePath("/planning");
  if (planId) revalidatePath(`/planning/${planId}`);
}

export async function createPlanAction(input: CreateEquipmentPlanInput): Promise<ActionResult<EquipmentPlanRow>> {
  const result = await runAction(() => equipmentPlanService.createPlan(input));
  revalidatePlans();
  return result;
}

export async function updatePlanAction(
  id: string,
  input: UpdateEquipmentPlanInput
): Promise<ActionResult<EquipmentPlanRow>> {
  const result = await runAction(() => equipmentPlanService.updatePlan(id, input));
  revalidatePlans(id);
  return result;
}

export async function getPlanAction(id: string): Promise<ActionResult<EquipmentPlanRow>> {
  return runAction(() => equipmentPlanService.getPlan(id));
}

export async function listPlansAction(
  filters: ListEquipmentPlansInput
): Promise<ActionResult<EquipmentPlanRow[]>> {
  return runAction(() => equipmentPlanService.listPlans(filters));
}

export async function deletePlanAction(id: string): Promise<ActionResult<void>> {
  const result = await runAction(() => equipmentPlanService.deletePlan(id));
  revalidatePlans();
  return result;
}

export async function addPlanItemAction(
  planId: string,
  input: CreatePlanItemInput
): Promise<ActionResult<EquipmentPlanItemRow>> {
  const result = await runAction(() => equipmentPlanService.addPlanItem(planId, input));
  revalidatePlans(planId);
  return result;
}

export async function updatePlanItemAction(
  id: string,
  planId: string,
  input: UpdatePlanItemInput
): Promise<ActionResult<EquipmentPlanItemRow>> {
  const result = await runAction(() => equipmentPlanService.updatePlanItem(id, input));
  revalidatePlans(planId);
  return result;
}

export async function deletePlanItemAction(id: string, planId: string): Promise<ActionResult<void>> {
  const result = await runAction(() => equipmentPlanService.deletePlanItem(id));
  revalidatePlans(planId);
  return result;
}

export async function listPlanItemsAction(planId: string): Promise<ActionResult<EquipmentPlanItemRow[]>> {
  return runAction(() => equipmentPlanService.listPlanItems(planId));
}

// Read-only — no mutation, still routed through runAction for a consistent ActionResult shape.
// Powers the live "12 of 40 available" feedback while a planner edits a plan item.
export async function getAvailabilityAction(
  request: AvailabilityRequest
): Promise<ActionResult<AvailabilityResult>> {
  return runAction(async () => {
    await assertAnyPermission(["planning.manage", "planning.view"]);
    return availabilityService.computeAvailability(request);
  });
}
