import "server-only";
import { equipmentPlanRepository } from "@/modules/planning/repositories/equipment-plan-repository";
import { equipmentPlanEligibilityRepository } from "@/modules/planning/repositories/equipment-plan-eligibility-repository";
import { equipmentPlanAssignmentRepository } from "@/modules/planning/repositories/equipment-plan-assignment-repository";
import { availabilityService } from "@/modules/planning/services/availability-service";
import { NotFoundError } from "@/modules/planning/errors";

export type PlanConflict = {
  planItemId?: string;
  conflictType: "double_booking" | "warehouse_mismatch" | "maintenance_conflict" | "status_unavailable";
  severity: "blocking" | "warning";
  conflictingPlanId?: string;
  description: string;
};

export type PlanShortage = {
  planItemId: string;
  quantityShort: number;
};

export type ConflictEvaluationResult = {
  conflicts: PlanConflict[];
  shortages: PlanShortage[];
};

// Assignment statuses that are expected for a plan currently at 'prepared' vs 'loaded' --
// anything outside these is surfaced as a blocking status_unavailable conflict. maintenance_
// conflict detection is deliberately not implemented here: it depends on a forward-looking
// maintenance schedule that doesn't exist yet (Module 2 only tracks completed maintenance) --
// an explicitly deferred follow-up, not an oversight.
const EXPECTED_STATUS_BY_PLAN_STAGE: Record<string, string[]> = {
  prepared: ["reserved", "picked", "in_transit"],
  loaded: ["in_transit", "on_site"],
};

// Pure compute, no writes, no permission checks (Module 4.2 requirement #6). Persisting the
// result is the caller's job (EquipmentPlanService / PlanWorkflowService), via
// equipmentConflictRepository.replaceForPlan. Block/warn/continue decisions belong to the
// calling workflow service, not here.
async function evaluate(planId: string): Promise<ConflictEvaluationResult> {
  const plan = await equipmentPlanRepository.findById(planId);
  if (!plan) throw new NotFoundError("Equipment plan");
  const items = await equipmentPlanRepository.findItems(planId);

  const conflicts: PlanConflict[] = [];
  const shortages: PlanShortage[] = [];

  for (const item of items) {
    const availability = await availabilityService.computeAvailability({
      modelId: item.model_id,
      warehouseId: item.warehouse_id ?? undefined,
      startAt: plan.event_start_at,
      endAt: plan.event_end_at,
      excludePlanId: plan.id,
    });

    if (availability.availableQuantity >= item.quantity_requested) continue;

    if (item.warehouse_id) {
      const anyWarehouse = await availabilityService.computeAvailability({
        modelId: item.model_id,
        warehouseId: undefined,
        startAt: plan.event_start_at,
        endAt: plan.event_end_at,
        excludePlanId: plan.id,
      });
      if (anyWarehouse.availableQuantity >= item.quantity_requested) {
        conflicts.push({
          planItemId: item.id,
          conflictType: "warehouse_mismatch",
          severity: "warning",
          description: `Only ${availability.availableQuantity} of ${item.quantity_requested} available at the requested warehouse, but ${anyWarehouse.availableQuantity} available across all warehouses.`,
        });
        continue;
      }
    }

    const breakdown = await equipmentPlanEligibilityRepository.findOverlappingApprovedPlanBreakdown(
      item.model_id,
      item.warehouse_id ?? undefined,
      plan.event_start_at,
      plan.event_end_at,
      plan.id
    );
    const shortfall = item.quantity_requested - availability.availableQuantity;
    const largest = breakdown[0];

    if (largest && largest.quantity >= shortfall) {
      conflicts.push({
        planItemId: item.id,
        conflictType: "double_booking",
        severity: "blocking",
        conflictingPlanId: largest.planId,
        description: `Requested ${item.quantity_requested}, but only ${availability.availableQuantity} available -- another approved plan overlapping this window accounts for the shortfall.`,
      });
    } else {
      shortages.push({ planItemId: item.id, quantityShort: shortfall });
    }
  }

  const expectedStatuses = EXPECTED_STATUS_BY_PLAN_STAGE[plan.status];
  if (expectedStatuses) {
    const assignments = await equipmentPlanAssignmentRepository.findByPlan(planId);
    for (const assignment of assignments) {
      if (!expectedStatuses.includes(assignment.current_status)) {
        conflicts.push({
          conflictType: "status_unavailable",
          severity: "blocking",
          description: `Item ${assignment.asset_tag} is "${assignment.current_status}", which is unexpected for a plan at the "${plan.status}" stage.`,
        });
      }
    }
  }

  return { conflicts, shortages };
}

export const conflictDetectionService = { evaluate };
