import "server-only";
import { assertAnyPermission } from "@/modules/planning/shared/authorize";
import { logPlanningAudit } from "@/modules/planning/shared/audit";
import { ConflictError, NotFoundError, toPlanningError } from "@/modules/planning/errors";
import {
  createEquipmentPlanSchema,
  updateEquipmentPlanSchema,
  listEquipmentPlansSchema,
  type CreateEquipmentPlanInput,
  type UpdateEquipmentPlanInput,
  type ListEquipmentPlansInput,
} from "@/modules/planning/schemas/equipment-plan-schema";
import { createPlanItemSchema, updatePlanItemSchema, type CreatePlanItemInput, type UpdatePlanItemInput } from "@/modules/planning/schemas/plan-item-schema";
import {
  equipmentPlanRepository,
  type EquipmentPlanRow,
  type EquipmentPlanItemRow,
} from "@/modules/planning/repositories/equipment-plan-repository";
import { equipmentConflictRepository } from "@/modules/planning/repositories/equipment-conflict-repository";
import { conflictDetectionService } from "@/modules/planning/services/conflict-detection-service";

const EDITABLE_STATUSES = new Set(["draft", "planning", "ready"]);
const DELETABLE_STATUSES = new Set(["draft", "planning", "cancelled"]);

async function requirePlan(id: string): Promise<EquipmentPlanRow> {
  const plan = await equipmentPlanRepository.findById(id);
  if (!plan) throw new NotFoundError("Equipment plan");
  return plan;
}

function assertEditable(plan: EquipmentPlanRow): void {
  if (!EDITABLE_STATUSES.has(plan.status)) {
    throw new ConflictError(
      `Plan is "${plan.status}" -- cancel and re-plan instead of editing committed demand.`
    );
  }
}

// Recomputes and persists conflicts/shortages after any plan-item mutation, so the UI's live
// availability/conflict feedback is always current. ConflictDetectionService itself never
// writes (Module 4.2 requirement #6) -- this is the one place EquipmentPlanService persists it.
async function refreshConflicts(planId: string): Promise<void> {
  const result = await conflictDetectionService.evaluate(planId);
  await equipmentConflictRepository.replaceForPlan(planId, result);
}

async function createPlan(input: CreateEquipmentPlanInput): Promise<EquipmentPlanRow> {
  const userId = await assertAnyPermission(["planning.manage", "planning.create"]);
  const parsed = createEquipmentPlanSchema.parse(input);

  try {
    const plan = await equipmentPlanRepository.create(parsed, userId);
    await logPlanningAudit("equipment_plan.created", "equipment_plans", plan.id, {
      name: parsed.name,
      eventStartAt: parsed.eventStartAt,
      eventEndAt: parsed.eventEndAt,
    });
    return plan;
  } catch (error) {
    throw toPlanningError(error, "Equipment plan");
  }
}

async function updatePlan(id: string, input: UpdateEquipmentPlanInput): Promise<EquipmentPlanRow> {
  const userId = await assertAnyPermission(["planning.manage", "planning.update"]);
  const parsed = updateEquipmentPlanSchema.parse(input);
  const plan = await requirePlan(id);
  assertEditable(plan);

  try {
    const updated = await equipmentPlanRepository.update(id, parsed, userId);
    await logPlanningAudit("equipment_plan.updated", "equipment_plans", id, parsed);
    return updated;
  } catch (error) {
    throw toPlanningError(error, "Equipment plan");
  }
}

async function getPlan(id: string): Promise<EquipmentPlanRow> {
  await assertAnyPermission(["planning.manage", "planning.view"]);
  return requirePlan(id);
}

async function listPlans(filters: ListEquipmentPlansInput): Promise<EquipmentPlanRow[]> {
  await assertAnyPermission(["planning.manage", "planning.view"]);
  const parsed = listEquipmentPlansSchema.parse(filters);
  return equipmentPlanRepository.list(parsed);
}

async function deletePlan(id: string): Promise<void> {
  const userId = await assertAnyPermission(["planning.manage", "planning.delete"]);
  const plan = await requirePlan(id);
  if (!DELETABLE_STATUSES.has(plan.status)) {
    throw new ConflictError(`Plan is "${plan.status}" -- cancel it first before deleting.`);
  }

  await equipmentPlanRepository.softDelete(id, userId);
  await logPlanningAudit("equipment_plan.deleted", "equipment_plans", id);
}

// Draft -> Planning is an automatic side effect of the first edit while not yet Ready (§6),
// not a manual transition -- applied here rather than in PlanWorkflowService since it's not a
// gated workflow step.
async function bumpDraftToPlanning(plan: EquipmentPlanRow, userId: string): Promise<void> {
  if (plan.status === "draft") {
    await equipmentPlanRepository.setStatus(plan.id, "planning", userId);
  }
}

async function addPlanItem(planId: string, input: CreatePlanItemInput): Promise<EquipmentPlanItemRow> {
  const userId = await assertAnyPermission(["planning.manage", "planning.create", "planning.update"]);
  const parsed = createPlanItemSchema.parse(input);
  const plan = await requirePlan(planId);
  assertEditable(plan);

  try {
    const item = await equipmentPlanRepository.createItem(planId, parsed, userId);
    await bumpDraftToPlanning(plan, userId);
    await refreshConflicts(planId);
    await logPlanningAudit("equipment_plan_item.added", "equipment_plan_items", item.id, {
      planId,
      modelId: parsed.modelId,
      quantityRequested: parsed.quantityRequested,
    });
    return item;
  } catch (error) {
    throw toPlanningError(error, "Plan item");
  }
}

async function updatePlanItem(id: string, input: UpdatePlanItemInput): Promise<EquipmentPlanItemRow> {
  const userId = await assertAnyPermission(["planning.manage", "planning.update"]);
  const parsed = updatePlanItemSchema.parse(input);
  const item = await equipmentPlanRepository.findItem(id);
  if (!item) throw new NotFoundError("Plan item");
  const plan = await requirePlan(item.plan_id);
  assertEditable(plan);

  try {
    const updated = await equipmentPlanRepository.updateItem(id, parsed, userId);
    await refreshConflicts(plan.id);
    await logPlanningAudit("equipment_plan_item.updated", "equipment_plan_items", id, parsed);
    return updated;
  } catch (error) {
    throw toPlanningError(error, "Plan item");
  }
}

async function deletePlanItem(id: string): Promise<void> {
  await assertAnyPermission(["planning.manage", "planning.update"]);
  const item = await equipmentPlanRepository.findItem(id);
  if (!item) throw new NotFoundError("Plan item");
  const plan = await requirePlan(item.plan_id);
  assertEditable(plan);

  await equipmentPlanRepository.deleteItem(id);
  await refreshConflicts(plan.id);
  await logPlanningAudit("equipment_plan_item.removed", "equipment_plan_items", id, { planId: plan.id });
}

async function listPlanItems(planId: string): Promise<EquipmentPlanItemRow[]> {
  await assertAnyPermission(["planning.manage", "planning.view"]);
  return equipmentPlanRepository.findItems(planId);
}

export const equipmentPlanService = {
  createPlan,
  updatePlan,
  getPlan,
  listPlans,
  deletePlan,
  addPlanItem,
  updatePlanItem,
  deletePlanItem,
  listPlanItems,
};
