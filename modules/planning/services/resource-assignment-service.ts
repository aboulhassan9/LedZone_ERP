import "server-only";
import { assertAnyPermission } from "@/modules/planning/shared/authorize";
import { logPlanningAudit } from "@/modules/planning/shared/audit";
import { NotFoundError, PermissionDeniedError, toPlanningError } from "@/modules/planning/errors";
import {
  createCrewMemberSchema,
  updateCrewMemberSchema,
  createVehicleSchema,
  updateVehicleSchema,
  assignCrewSchema,
  assignVehicleSchema,
  type CreateCrewMemberInput,
  type UpdateCrewMemberInput,
  type CreateVehicleInput,
  type UpdateVehicleInput,
  type AssignCrewInput,
  type AssignVehicleInput,
} from "@/modules/planning/schemas/resource-assignment-schema";
import {
  resourceAssignmentRepository,
  type CrewMemberRow,
  type VehicleRow,
  type ResourceAssignmentRow,
} from "@/modules/planning/repositories/resource-assignment-repository";

// Crew/vehicle directory + booking CRUD only. No crew/vehicle double-booking conflict
// detection here — an explicit, already-agreed scope decision (belongs to a future HR/Fleet
// module, see the architecture doc's §2 scope note), carried through unchanged.

async function createCrewMember(input: CreateCrewMemberInput): Promise<CrewMemberRow> {
  const userId = await assertAnyPermission(["planning.manage", "planning.assign.crew"]);
  const parsed = createCrewMemberSchema.parse(input);
  try {
    const crewMember = await resourceAssignmentRepository.createCrewMember(parsed, userId);
    await logPlanningAudit("crew_member.created", "crew_members", crewMember.id, { fullName: parsed.fullName });
    return crewMember;
  } catch (error) {
    throw toPlanningError(error, "Crew member");
  }
}

async function updateCrewMember(id: string, input: UpdateCrewMemberInput): Promise<CrewMemberRow> {
  const userId = await assertAnyPermission(["planning.manage", "planning.assign.crew"]);
  const parsed = updateCrewMemberSchema.parse(input);
  const existing = await resourceAssignmentRepository.findCrewMember(id);
  if (!existing) throw new NotFoundError("Crew member");

  try {
    const crewMember = await resourceAssignmentRepository.updateCrewMember(id, parsed, userId);
    await logPlanningAudit("crew_member.updated", "crew_members", id, parsed);
    return crewMember;
  } catch (error) {
    throw toPlanningError(error, "Crew member");
  }
}

async function listCrewMembers(): Promise<CrewMemberRow[]> {
  await assertAnyPermission(["planning.manage", "planning.view"]);
  return resourceAssignmentRepository.listCrewMembers();
}

async function createVehicle(input: CreateVehicleInput): Promise<VehicleRow> {
  const userId = await assertAnyPermission(["planning.manage", "planning.assign.vehicle"]);
  const parsed = createVehicleSchema.parse(input);
  try {
    const vehicle = await resourceAssignmentRepository.createVehicle(parsed, userId);
    await logPlanningAudit("vehicle.created", "vehicles", vehicle.id, { name: parsed.name });
    return vehicle;
  } catch (error) {
    throw toPlanningError(error, "Vehicle");
  }
}

async function updateVehicle(id: string, input: UpdateVehicleInput): Promise<VehicleRow> {
  const userId = await assertAnyPermission(["planning.manage", "planning.assign.vehicle"]);
  const parsed = updateVehicleSchema.parse(input);
  const existing = await resourceAssignmentRepository.findVehicle(id);
  if (!existing) throw new NotFoundError("Vehicle");

  try {
    const vehicle = await resourceAssignmentRepository.updateVehicle(id, parsed, userId);
    await logPlanningAudit("vehicle.updated", "vehicles", id, parsed);
    return vehicle;
  } catch (error) {
    throw toPlanningError(error, "Vehicle");
  }
}

async function listVehicles(): Promise<VehicleRow[]> {
  await assertAnyPermission(["planning.manage", "planning.view"]);
  return resourceAssignmentRepository.listVehicles();
}

async function assignCrew(planId: string, input: AssignCrewInput): Promise<ResourceAssignmentRow> {
  const userId = await assertAnyPermission(["planning.manage", "planning.assign.crew"]);
  const parsed = assignCrewSchema.parse(input);

  try {
    const assignment = await resourceAssignmentRepository.assignCrew(planId, parsed, userId);
    await logPlanningAudit("resource_assignment.crew_assigned", "resource_assignments", assignment.id, {
      planId,
      crewMemberId: parsed.crewMemberId,
    });
    return assignment;
  } catch (error) {
    throw toPlanningError(error, "Crew assignment");
  }
}

async function assignVehicle(planId: string, input: AssignVehicleInput): Promise<ResourceAssignmentRow> {
  const userId = await assertAnyPermission(["planning.manage", "planning.assign.vehicle"]);
  const parsed = assignVehicleSchema.parse(input);

  try {
    const assignment = await resourceAssignmentRepository.assignVehicle(planId, parsed, userId);
    await logPlanningAudit("resource_assignment.vehicle_assigned", "resource_assignments", assignment.id, {
      planId,
      vehicleId: parsed.vehicleId,
    });
    return assignment;
  } catch (error) {
    throw toPlanningError(error, "Vehicle assignment");
  }
}

async function removeAssignment(id: string): Promise<void> {
  const assignment = await resourceAssignmentRepository.findAssignment(id);
  if (!assignment) throw new NotFoundError("Resource assignment");

  if (assignment.resource_type === "crew") {
    await assertAnyPermission(["planning.manage", "planning.assign.crew"]);
  } else if (assignment.resource_type === "vehicle") {
    await assertAnyPermission(["planning.manage", "planning.assign.vehicle"]);
  } else {
    throw new PermissionDeniedError();
  }

  await resourceAssignmentRepository.removeAssignment(id);
  await logPlanningAudit("resource_assignment.removed", "resource_assignments", id, {
    resourceType: assignment.resource_type,
  });
}

async function listAssignmentsForPlan(planId: string): Promise<ResourceAssignmentRow[]> {
  await assertAnyPermission(["planning.manage", "planning.view"]);
  return resourceAssignmentRepository.findByPlan(planId);
}

export const resourceAssignmentService = {
  createCrewMember,
  updateCrewMember,
  listCrewMembers,
  createVehicle,
  updateVehicle,
  listVehicles,
  assignCrew,
  assignVehicle,
  removeAssignment,
  listAssignmentsForPlan,
};
