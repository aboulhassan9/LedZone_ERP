import "server-only";
import { assertAnyPermission } from "@/modules/planning/shared/authorize";
import { logPlanningAudit } from "@/modules/planning/shared/audit";
import { ConflictError, InvalidPlanStateError, NotFoundError, toPlanningError } from "@/modules/planning/errors";
import { cancelPlanSchema, type CancelPlanInput } from "@/modules/planning/schemas/workflow-schema";
import {
  equipmentPlanRepository,
  type EquipmentPlanRow,
} from "@/modules/planning/repositories/equipment-plan-repository";
import { equipmentPlanAssignmentRepository } from "@/modules/planning/repositories/equipment-plan-assignment-repository";
import { equipmentConflictRepository } from "@/modules/planning/repositories/equipment-conflict-repository";
import { equipmentPlanVersionRepository } from "@/modules/planning/repositories/equipment-plan-version-repository";
import { conflictDetectionService } from "@/modules/planning/services/conflict-detection-service";
import { availabilityService } from "@/modules/planning/services/availability-service";
import { equipmentModelRepository } from "@/modules/inventory/repositories/equipment-model-repository";

async function requirePlan(id: string): Promise<EquipmentPlanRow> {
  const plan = await equipmentPlanRepository.findById(id);
  if (!plan) throw new NotFoundError("Equipment plan");
  return plan;
}

function assertStatus(plan: EquipmentPlanRow, expected: string): void {
  if (plan.status !== expected) {
    throw new InvalidPlanStateError(`Plan is "${plan.status}", not ${expected}.`);
  }
}

// Full plan_items + assignments + conflicts state at the moment of a workflow transition —
// passed to each RPC so the version row is written atomically with the status change.
async function buildSnapshot(planId: string): Promise<Record<string, unknown>> {
  const [items, assignments, conflicts, shortages] = await Promise.all([
    equipmentPlanRepository.findItems(planId),
    equipmentPlanAssignmentRepository.findByPlan(planId),
    equipmentConflictRepository.findForPlan(planId),
    equipmentConflictRepository.findUnresolvedShortages(planId),
  ]);
  return { items, assignments, conflicts, shortages };
}

async function refreshConflicts(planId: string): Promise<void> {
  const result = await conflictDetectionService.evaluate(planId);
  await equipmentConflictRepository.replaceForPlan(planId, result);
}

// Draft|Planning -> Ready. A checkpoint, not a gate — conflicts are surfaced, not blocked.
async function submitToReady(planId: string): Promise<EquipmentPlanRow> {
  const userId = await assertAnyPermission(["planning.manage", "planning.update"]);
  const plan = await requirePlan(planId);
  if (plan.status !== "draft" && plan.status !== "planning") {
    throw new InvalidPlanStateError(`Plan is "${plan.status}", not draft/planning.`);
  }

  const items = await equipmentPlanRepository.findItems(planId);
  if (items.length === 0) {
    throw new ConflictError("A plan needs at least one item before it can be marked ready.");
  }

  await refreshConflicts(planId);
  const updated = await equipmentPlanRepository.setStatus(planId, "ready", userId);
  await logPlanningAudit("equipment_plan.ready", "equipment_plans", planId);
  return updated;
}

async function revertToPlanning(planId: string): Promise<EquipmentPlanRow> {
  const userId = await assertAnyPermission(["planning.manage", "planning.update"]);
  const plan = await requirePlan(planId);
  assertStatus(plan, "ready");

  const updated = await equipmentPlanRepository.setStatus(planId, "planning", userId);
  await logPlanningAudit("equipment_plan.reverted_to_planning", "equipment_plans", planId);
  return updated;
}

async function approvePlan(planId: string): Promise<EquipmentPlanRow> {
  await assertAnyPermission(["planning.manage", "planning.approve"]);
  const plan = await requirePlan(planId);
  assertStatus(plan, "ready");

  await refreshConflicts(planId);
  const blocking = await equipmentConflictRepository.findUnresolvedBlocking(planId);
  if (blocking.length > 0) {
    throw new ConflictError(
      `Plan has ${blocking.length} unresolved blocking conflict(s) — resolve them before approving.`
    );
  }

  try {
    const snapshot = await buildSnapshot(planId);
    const updated = await equipmentPlanRepository.approveViaTransaction(planId, snapshot, null);
    await logPlanningAudit("equipment_plan.approved", "equipment_plans", planId);
    return updated;
  } catch (error) {
    throw toPlanningError(error, "Equipment plan");
  }
}

// Approved -> Prepared: assigns specific items (FIFO, via AvailabilityService) and creates
// real warehouse reservations, atomically. See §3/§8 — the RPC never re-derives eligibility,
// it only performs the write this function already decided.
async function preparePlan(planId: string): Promise<EquipmentPlanRow> {
  await assertAnyPermission(["planning.manage", "planning.prepare"]);
  const plan = await requirePlan(planId);
  assertStatus(plan, "approved");

  await refreshConflicts(planId);
  const shortages = await equipmentConflictRepository.findUnresolvedShortages(planId);
  if (shortages.length > 0) {
    throw new ConflictError(
      `Plan has ${shortages.length} unresolved shortage(s) — cannot prepare it until resolved.`
    );
  }

  const items = await equipmentPlanRepository.findItems(planId);
  const assignments: { planItemId: string; itemId: string }[] = [];

  for (const item of items) {
    const model = await equipmentModelRepository.findById(item.model_id);
    if (!model) throw new NotFoundError("Equipment model");
    if (model.tracking_type !== "individual") continue; // consumables: quantity commitment only, no assignment rows

    const existing = await equipmentPlanAssignmentRepository.findByPlanItem(item.id);
    const remaining = item.quantity_requested - existing.length;
    if (remaining <= 0) continue;

    const itemIds = await availabilityService.selectEligibleItems(
      item.model_id,
      item.warehouse_id ?? undefined,
      remaining
    );
    if (itemIds.length < remaining) {
      throw new ConflictError(
        `Only ${itemIds.length} of ${remaining} still-needed unit(s) are actually available for plan item ${item.id} — availability changed since the last check.`
      );
    }
    for (const itemId of itemIds) {
      assignments.push({ planItemId: item.id, itemId });
    }
  }

  try {
    const snapshot = await buildSnapshot(planId);
    const updated = await equipmentPlanRepository.prepareViaTransaction(planId, assignments, snapshot, null);
    await logPlanningAudit("equipment_plan.prepared", "equipment_plans", planId, {
      assignedCount: assignments.length,
    });
    return updated;
  } catch (error) {
    throw toPlanningError(error, "Equipment plan");
  }
}

// Prepared -> Loaded. A gate, not a driver — see modules/inventory/services/equipment-item-
// service.ts's returnEquipmentItem/reserveEquipmentItem comments and 0055's load_equipment_plan
// for the full reasoning: Warehouse's existing pick/dispatch screens already own reserved ->
// picked -> in_transit, untouched by this function.
async function loadPlan(planId: string): Promise<EquipmentPlanRow> {
  await assertAnyPermission(["planning.manage", "planning.load"]);
  const plan = await requirePlan(planId);
  assertStatus(plan, "prepared");

  try {
    const snapshot = await buildSnapshot(planId);
    const updated = await equipmentPlanRepository.loadViaTransaction(planId, snapshot, null);
    await logPlanningAudit("equipment_plan.loaded", "equipment_plans", planId);
    return updated;
  } catch (error) {
    throw toPlanningError(error, "Equipment plan");
  }
}

// Loaded -> Completed. Strict: complete_equipment_plan aborts naming the offending item if any
// assignment isn't in_transit/on_site/returned — see 0055's comment.
async function completePlan(planId: string): Promise<EquipmentPlanRow> {
  await assertAnyPermission(["planning.manage", "planning.complete"]);
  const plan = await requirePlan(planId);
  assertStatus(plan, "loaded");

  try {
    const snapshot = await buildSnapshot(planId);
    const updated = await equipmentPlanRepository.completeViaTransaction(planId, snapshot, null);
    await logPlanningAudit("equipment_plan.completed", "equipment_plans", planId);
    return updated;
  } catch (error) {
    throw toPlanningError(error, "Equipment plan");
  }
}

async function cancelPlan(planId: string, input: CancelPlanInput): Promise<EquipmentPlanRow> {
  await assertAnyPermission(["planning.manage", "planning.cancel"]);
  const parsed = cancelPlanSchema.parse(input);
  const plan = await requirePlan(planId);
  if (["loaded", "completed", "cancelled"].includes(plan.status)) {
    throw new InvalidPlanStateError(`Plan is already "${plan.status}" — cannot cancel it.`);
  }

  try {
    const snapshot = await buildSnapshot(planId);
    const updated = await equipmentPlanRepository.cancelViaTransaction(
      planId,
      snapshot,
      parsed.reason ?? null
    );
    await logPlanningAudit("equipment_plan.cancelled", "equipment_plans", planId, {
      reason: parsed.reason,
    });
    return updated;
  } catch (error) {
    throw toPlanningError(error, "Equipment plan");
  }
}

async function listVersions(planId: string) {
  await assertAnyPermission(["planning.manage", "planning.view"]);
  return equipmentPlanVersionRepository.list(planId);
}

export const planWorkflowService = {
  submitToReady,
  revertToPlanning,
  approvePlan,
  preparePlan,
  loadPlan,
  completePlan,
  cancelPlan,
  listVersions,
};
