import "server-only";
import { equipmentPlanEligibilityRepository } from "@/modules/planning/repositories/equipment-plan-eligibility-repository";
import { equipmentPlanRepository } from "@/modules/planning/repositories/equipment-plan-repository";
import { NotFoundError } from "@/modules/planning/errors";

// Only 'available' is eligible for new demand. This is narrower than the architecture doc's
// original "in_maintenance/quarantined/in_use" exclusion list -- a deliberate refinement, since
// Prepare/Load/Complete now drive real current_status transitions (reserved/in_transit/
// on_site/returned), so an item mid-plan-lifecycle for someone else's event is excluded by
// status alone, not just by the active-reservation check (which still matters separately, for
// Warehouse-originated reservations that don't touch current_status at all).
const ELIGIBLE_STATUS = "available";

export type AvailabilityRequest = {
  modelId: string;
  warehouseId?: string;
  startAt: string;
  endAt: string;
  excludePlanId?: string;
};

export type AvailabilityResult = {
  availableQuantity: number;
  eligiblePoolSize: number;
  breakdown: {
    unavailableStatus: number;
    activeReservations: number;
    midTransfer: number;
    committedByOtherApprovedPlans: number;
  };
};

// The Availability Engine (Module 4.2 requirement #5): the sole source of truth for equipment
// availability. Nothing else in modules/planning computes this independently.
async function computeAvailability(request: AvailabilityRequest): Promise<AvailabilityResult> {
  const pool = await equipmentPlanEligibilityRepository.findEligiblePool(request.modelId, request.warehouseId);
  const poolIds = pool.map((i) => i.id);

  const unavailableStatusIds = new Set(
    pool.filter((i) => i.current_status !== ELIGIBLE_STATUS).map((i) => i.id)
  );
  const activeReservationIds = await equipmentPlanEligibilityRepository.findActiveReservationItemIds(poolIds);
  const midTransferIds = await equipmentPlanEligibilityRepository.findMidTransferItemIds(poolIds);

  const unavailableIds = new Set<string>([...unavailableStatusIds, ...activeReservationIds, ...midTransferIds]);

  // Only 'approved' plans are summed -- 'prepared'/'loaded' plans are already reflected
  // physically (their items already carry a non-'available' status and/or an active
  // reservation, both already subtracted above), so summing them again would double-count.
  const committedByOtherApprovedPlans = await equipmentPlanEligibilityRepository.findOverlappingApprovedDemand(
    request.modelId,
    request.warehouseId,
    request.startAt,
    request.endAt,
    request.excludePlanId
  );

  const availableQuantity = Math.max(0, pool.length - unavailableIds.size - committedByOtherApprovedPlans);

  return {
    availableQuantity,
    eligiblePoolSize: pool.length,
    breakdown: {
      unavailableStatus: unavailableStatusIds.size,
      activeReservations: activeReservationIds.size,
      midTransfer: midTransferIds.size,
      committedByOtherApprovedPlans,
    },
  };
}

async function computeAvailabilityForPlanItem(planItemId: string): Promise<AvailabilityResult> {
  const item = await equipmentPlanRepository.findItem(planItemId);
  if (!item) throw new NotFoundError("Plan item");
  const plan = await equipmentPlanRepository.findById(item.plan_id);
  if (!plan) throw new NotFoundError("Equipment plan");

  return computeAvailability({
    modelId: item.model_id,
    warehouseId: item.warehouse_id ?? undefined,
    startAt: plan.event_start_at,
    endAt: plan.event_end_at,
    excludePlanId: plan.id,
  });
}

// Selects up to `quantity` truly-available items (FIFO -- oldest created_at first) for the
// Prepare-stage assignment. This is the only place specific item IDs are chosen --
// prepare_equipment_plan (the RPC) never re-derives eligibility, it only writes what this
// function already decided, relying on create_warehouse_reservation's unique index as the
// final concurrency guard against a race this function can't fully rule out on its own.
async function selectEligibleItems(
  modelId: string,
  warehouseId: string | undefined,
  quantity: number
): Promise<string[]> {
  const pool = await equipmentPlanEligibilityRepository.findEligiblePool(modelId, warehouseId);
  const poolIds = pool.map((i) => i.id);

  const activeReservationIds = await equipmentPlanEligibilityRepository.findActiveReservationItemIds(poolIds);
  const midTransferIds = await equipmentPlanEligibilityRepository.findMidTransferItemIds(poolIds);

  return pool
    .filter(
      (i) =>
        i.current_status === ELIGIBLE_STATUS &&
        !activeReservationIds.has(i.id) &&
        !midTransferIds.has(i.id)
    )
    .slice(0, quantity)
    .map((i) => i.id);
}

export const availabilityService = {
  computeAvailability,
  computeAvailabilityForPlanItem,
  selectEligibleItems,
};
