import "server-only";
import { createClient } from "@/lib/supabase/server";

export type EligibleEquipmentItemRow = {
  id: string;
  current_status: string;
  current_storage_location_id: string | null;
  created_at: string;
};

// Read-only data access for the Availability Engine (services/availability-service.ts) --
// the sole caller of this repository. Never called from anywhere else in modules/planning, so
// AvailabilityService stays the single source of truth for what "available" means (Module 4.2
// requirement #5).
export const equipmentPlanEligibilityRepository = {
  async findStorageLocationIdsForWarehouse(warehouseId: string): Promise<string[]> {
    const supabase = await createClient();
    const { data: nodes, error: nodesError } = await supabase
      .from("warehouse_locations")
      .select("id")
      .eq("warehouse_id", warehouseId);
    if (nodesError) throw nodesError;

    const nodeIds = (nodes ?? []).map((n) => n.id);
    if (nodeIds.length === 0) return [];

    const { data, error } = await supabase
      .from("storage_locations")
      .select("id")
      .in("warehouse_location_id", nodeIds);
    if (error) throw error;
    return (data ?? []).map((s) => s.id);
  },

  // Eligible pool for a model: not scrapped/lost, not soft-deleted, optionally scoped to a
  // warehouse via the storage_locations -> warehouse_locations bridge. Ordered oldest-first
  // for the FIFO selection used at Prepare.
  async findEligiblePool(modelId: string, warehouseId?: string): Promise<EligibleEquipmentItemRow[]> {
    const supabase = await createClient();
    let query = supabase
      .from("equipment_items")
      .select("id, current_status, current_storage_location_id, created_at")
      .eq("model_id", modelId)
      .not("current_status", "in", "(scrapped,lost)")
      .is("deleted_at", null);

    if (warehouseId) {
      const storageLocationIds = await this.findStorageLocationIdsForWarehouse(warehouseId);
      if (storageLocationIds.length === 0) return [];
      query = query.in("current_storage_location_id", storageLocationIds);
    }

    const { data, error } = await query.order("created_at", { ascending: true });
    if (error) throw error;
    return data ?? [];
  },

  async findActiveReservationItemIds(itemIds: string[]): Promise<Set<string>> {
    if (itemIds.length === 0) return new Set();
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("warehouse_reservations")
      .select("item_id")
      .in("item_id", itemIds)
      .is("released_at", null)
      .gt("expires_at", new Date().toISOString());
    if (error) throw error;
    return new Set((data ?? []).map((r) => r.item_id).filter((id): id is string => id !== null));
  },

  async findMidTransferItemIds(itemIds: string[]): Promise<Set<string>> {
    if (itemIds.length === 0) return new Set();
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("warehouse_transfer_lines")
      .select("item_id")
      .in("item_id", itemIds)
      .in("status", ["pending", "in_transit"]);
    if (error) throw error;
    return new Set((data ?? []).map((l) => l.item_id).filter((id): id is string => id !== null));
  },

  // Sums quantity_requested from other plans still at Approved (not Prepared/Loaded -- those
  // are already reflected physically, via active reservations or non-eligible item status, so
  // summing them again here would double-count the same units) whose event window overlaps
  // [startAt, endAt), for the same model (and warehouse, if scoped), excluding excludePlanId.
  async findOverlappingApprovedDemand(
    modelId: string,
    warehouseId: string | undefined,
    startAt: string,
    endAt: string,
    excludePlanId?: string
  ): Promise<number> {
    const supabase = await createClient();
    let query = supabase
      .from("equipment_plan_items")
      .select("quantity_requested, warehouse_id, plan:equipment_plans!inner(id, status, event_start_at, event_end_at)")
      .eq("model_id", modelId)
      .eq("plan.status", "approved")
      .lt("plan.event_start_at", endAt)
      .gt("plan.event_end_at", startAt);

    if (excludePlanId) query = query.neq("plan_id", excludePlanId);

    const { data, error } = await query;
    if (error) throw error;

    const rows = (data ?? []) as unknown as { quantity_requested: number; warehouse_id: string | null }[];
    const scoped = warehouseId ? rows.filter((r) => !r.warehouse_id || r.warehouse_id === warehouseId) : rows;
    return scoped.reduce((sum, r) => sum + Number(r.quantity_requested), 0);
  },

  // Same overlap query as findOverlappingApprovedDemand, but broken down per contributing
  // plan -- used by ConflictDetectionService to attribute a shortfall to a single
  // double_booking conflict when one plan explains it, rather than a generic shortage.
  async findOverlappingApprovedPlanBreakdown(
    modelId: string,
    warehouseId: string | undefined,
    startAt: string,
    endAt: string,
    excludePlanId?: string
  ): Promise<{ planId: string; quantity: number }[]> {
    const supabase = await createClient();
    let query = supabase
      .from("equipment_plan_items")
      .select("plan_id, quantity_requested, warehouse_id, plan:equipment_plans!inner(id, status, event_start_at, event_end_at)")
      .eq("model_id", modelId)
      .eq("plan.status", "approved")
      .lt("plan.event_start_at", endAt)
      .gt("plan.event_end_at", startAt);

    if (excludePlanId) query = query.neq("plan_id", excludePlanId);

    const { data, error } = await query;
    if (error) throw error;

    const rows = (data ?? []) as unknown as {
      plan_id: string;
      quantity_requested: number;
      warehouse_id: string | null;
    }[];
    const scoped = warehouseId ? rows.filter((r) => !r.warehouse_id || r.warehouse_id === warehouseId) : rows;

    const byPlan = new Map<string, number>();
    for (const r of scoped) {
      byPlan.set(r.plan_id, (byPlan.get(r.plan_id) ?? 0) + Number(r.quantity_requested));
    }
    return Array.from(byPlan.entries())
      .map(([planId, quantity]) => ({ planId, quantity }))
      .sort((a, b) => b.quantity - a.quantity);
  },
};
