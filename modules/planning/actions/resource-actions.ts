"use server";

import { revalidatePath } from "next/cache";
import { runAction } from "@/modules/planning/shared/run-action";
import type { ActionResult } from "@/modules/warehouse/types/action-result";
import { resourceAssignmentService } from "@/modules/planning/services/resource-assignment-service";
import type {
  CreateCrewMemberInput,
  UpdateCrewMemberInput,
  CreateVehicleInput,
  UpdateVehicleInput,
  AssignCrewInput,
  AssignVehicleInput,
} from "@/modules/planning/schemas/resource-assignment-schema";
import type {
  CrewMemberRow,
  VehicleRow,
  ResourceAssignmentRow,
} from "@/modules/planning/repositories/resource-assignment-repository";

function revalidatePlan(planId: string) {
  revalidatePath(`/planning/${planId}`);
}

export async function createCrewMemberAction(
  input: CreateCrewMemberInput
): Promise<ActionResult<CrewMemberRow>> {
  const result = await runAction(() => resourceAssignmentService.createCrewMember(input));
  revalidatePath("/planning/crew");
  return result;
}

export async function updateCrewMemberAction(
  id: string,
  input: UpdateCrewMemberInput
): Promise<ActionResult<CrewMemberRow>> {
  const result = await runAction(() => resourceAssignmentService.updateCrewMember(id, input));
  revalidatePath("/planning/crew");
  return result;
}

export async function listCrewMembersAction(): Promise<ActionResult<CrewMemberRow[]>> {
  return runAction(() => resourceAssignmentService.listCrewMembers());
}

export async function createVehicleAction(input: CreateVehicleInput): Promise<ActionResult<VehicleRow>> {
  const result = await runAction(() => resourceAssignmentService.createVehicle(input));
  revalidatePath("/planning/vehicles");
  return result;
}

export async function updateVehicleAction(
  id: string,
  input: UpdateVehicleInput
): Promise<ActionResult<VehicleRow>> {
  const result = await runAction(() => resourceAssignmentService.updateVehicle(id, input));
  revalidatePath("/planning/vehicles");
  return result;
}

export async function listVehiclesAction(): Promise<ActionResult<VehicleRow[]>> {
  return runAction(() => resourceAssignmentService.listVehicles());
}

export async function assignCrewAction(
  planId: string,
  input: AssignCrewInput
): Promise<ActionResult<ResourceAssignmentRow>> {
  const result = await runAction(() => resourceAssignmentService.assignCrew(planId, input));
  revalidatePlan(planId);
  return result;
}

export async function assignVehicleAction(
  planId: string,
  input: AssignVehicleInput
): Promise<ActionResult<ResourceAssignmentRow>> {
  const result = await runAction(() => resourceAssignmentService.assignVehicle(planId, input));
  revalidatePlan(planId);
  return result;
}

export async function removeAssignmentAction(
  id: string,
  planId: string
): Promise<ActionResult<void>> {
  const result = await runAction(() => resourceAssignmentService.removeAssignment(id));
  revalidatePlan(planId);
  return result;
}

export async function listAssignmentsForPlanAction(
  planId: string
): Promise<ActionResult<ResourceAssignmentRow[]>> {
  return runAction(() => resourceAssignmentService.listAssignmentsForPlan(planId));
}
