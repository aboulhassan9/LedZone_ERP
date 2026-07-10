import "server-only";
import { createClient } from "@/lib/supabase/server";
import type {
  CreateEquipmentPlanInput,
  UpdateEquipmentPlanInput,
  ListEquipmentPlansInput,
} from "@/modules/planning/schemas/equipment-plan-schema";
import type { CreatePlanItemInput, UpdatePlanItemInput } from "@/modules/planning/schemas/plan-item-schema";

export type EquipmentPlanRow = {
  id: string;
  name: string;
  event_start_at: string;
  event_end_at: string;
  customer_reference: string | null;
  event_reference: string | null;
  status: string;
  primary_warehouse_id: string | null;
  notes: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
};

export type EquipmentPlanItemRow = {
  id: string;
  plan_id: string;
  model_id: string;
  quantity_requested: number;
  warehouse_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

const PLAN_COLUMNS =
  "id, name, event_start_at, event_end_at, customer_reference, event_reference, status, primary_warehouse_id, notes, approved_by, approved_at, created_at, updated_at";
const PLAN_ITEM_COLUMNS =
  "id, plan_id, model_id, quantity_requested, warehouse_id, notes, created_at, updated_at";

export const equipmentPlanRepository = {
  async findById(id: string): Promise<EquipmentPlanRow | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("equipment_plans")
      .select(PLAN_COLUMNS)
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async list(filters: ListEquipmentPlansInput): Promise<EquipmentPlanRow[]> {
    const supabase = await createClient();
    let query = supabase.from("equipment_plans").select(PLAN_COLUMNS).is("deleted_at", null);
    if (filters.status) query = query.eq("status", filters.status);
    if (filters.warehouseId) query = query.eq("primary_warehouse_id", filters.warehouseId);
    const { data, error } = await query.order("event_start_at", { ascending: true });
    if (error) throw error;
    return data ?? [];
  },

  async create(input: CreateEquipmentPlanInput, userId: string): Promise<EquipmentPlanRow> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("equipment_plans")
      .insert({
        name: input.name,
        event_start_at: input.eventStartAt,
        event_end_at: input.eventEndAt,
        customer_reference: input.customerReference ?? null,
        event_reference: input.eventReference ?? null,
        primary_warehouse_id: input.primaryWarehouseId ?? null,
        notes: input.notes ?? null,
        status: "draft",
        created_by: userId,
        updated_by: userId,
      })
      .select(PLAN_COLUMNS)
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: string, input: UpdateEquipmentPlanInput, userId: string): Promise<EquipmentPlanRow> {
    const supabase = await createClient();
    const patch: Record<string, unknown> = { updated_by: userId };
    if (input.name !== undefined) patch.name = input.name;
    if (input.eventStartAt !== undefined) patch.event_start_at = input.eventStartAt;
    if (input.eventEndAt !== undefined) patch.event_end_at = input.eventEndAt;
    if (input.customerReference !== undefined) patch.customer_reference = input.customerReference;
    if (input.eventReference !== undefined) patch.event_reference = input.eventReference;
    if (input.primaryWarehouseId !== undefined) patch.primary_warehouse_id = input.primaryWarehouseId;
    if (input.notes !== undefined) patch.notes = input.notes;

    const { data, error } = await supabase
      .from("equipment_plans")
      .update(patch)
      .eq("id", id)
      .select(PLAN_COLUMNS)
      .single();
    if (error) throw error;
    return data;
  },

  // Only reachable from draft/planning -- Draft->Planning is a side effect the caller applies
  // separately via this same method, not a dedicated workflow RPC (a single-column update is
  // already atomic on its own).
  async setStatus(id: string, status: string, userId: string): Promise<EquipmentPlanRow> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("equipment_plans")
      .update({ status, updated_by: userId })
      .eq("id", id)
      .select(PLAN_COLUMNS)
      .single();
    if (error) throw error;
    return data;
  },

  async softDelete(id: string, userId: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase
      .from("equipment_plans")
      .update({ deleted_at: new Date().toISOString(), deleted_by: userId })
      .eq("id", id);
    if (error) throw error;
  },

  async findItems(planId: string): Promise<EquipmentPlanItemRow[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("equipment_plan_items")
      .select(PLAN_ITEM_COLUMNS)
      .eq("plan_id", planId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return data ?? [];
  },

  async findItem(id: string): Promise<EquipmentPlanItemRow | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("equipment_plan_items")
      .select(PLAN_ITEM_COLUMNS)
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async createItem(
    planId: string,
    input: CreatePlanItemInput,
    userId: string
  ): Promise<EquipmentPlanItemRow> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("equipment_plan_items")
      .insert({
        plan_id: planId,
        model_id: input.modelId,
        quantity_requested: input.quantityRequested,
        warehouse_id: input.warehouseId ?? null,
        notes: input.notes ?? null,
        created_by: userId,
        updated_by: userId,
      })
      .select(PLAN_ITEM_COLUMNS)
      .single();
    if (error) throw error;
    return data;
  },

  async updateItem(
    id: string,
    input: UpdatePlanItemInput,
    userId: string
  ): Promise<EquipmentPlanItemRow> {
    const supabase = await createClient();
    const patch: Record<string, unknown> = { updated_by: userId };
    if (input.quantityRequested !== undefined) patch.quantity_requested = input.quantityRequested;
    if (input.warehouseId !== undefined) patch.warehouse_id = input.warehouseId;
    if (input.notes !== undefined) patch.notes = input.notes;

    const { data, error } = await supabase
      .from("equipment_plan_items")
      .update(patch)
      .eq("id", id)
      .select(PLAN_ITEM_COLUMNS)
      .single();
    if (error) throw error;
    return data;
  },

  async deleteItem(id: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("equipment_plan_items").delete().eq("id", id);
    if (error) throw error;
  },

  // --- Workflow transitions (0055): each is one atomic SECURITY DEFINER function -- see
  // supabase/migrations/0055_planning_workflow_functions.sql for what each does. Named
  // *ViaTransaction to match warehouseTransferRepository's convention for the same shape.

  async prepareViaTransaction(
    planId: string,
    assignments: { planItemId: string; itemId: string }[],
    snapshotJson: Record<string, unknown>,
    changeSummary: string | null
  ): Promise<EquipmentPlanRow> {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("prepare_equipment_plan", {
      p_plan_id: planId,
      p_assignments: assignments.map((a) => ({ plan_item_id: a.planItemId, item_id: a.itemId })),
      p_snapshot_json: snapshotJson,
      p_change_summary: changeSummary,
    });
    if (error) throw error;
    return data;
  },

  async approveViaTransaction(
    planId: string,
    snapshotJson: Record<string, unknown>,
    changeSummary: string | null
  ): Promise<EquipmentPlanRow> {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("approve_equipment_plan", {
      p_plan_id: planId,
      p_snapshot_json: snapshotJson,
      p_change_summary: changeSummary,
    });
    if (error) throw error;
    return data;
  },

  async loadViaTransaction(
    planId: string,
    snapshotJson: Record<string, unknown>,
    changeSummary: string | null
  ): Promise<EquipmentPlanRow> {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("load_equipment_plan", {
      p_plan_id: planId,
      p_snapshot_json: snapshotJson,
      p_change_summary: changeSummary,
    });
    if (error) throw error;
    return data;
  },

  async completeViaTransaction(
    planId: string,
    snapshotJson: Record<string, unknown>,
    changeSummary: string | null
  ): Promise<EquipmentPlanRow> {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("complete_equipment_plan", {
      p_plan_id: planId,
      p_snapshot_json: snapshotJson,
      p_change_summary: changeSummary,
    });
    if (error) throw error;
    return data;
  },

  async cancelViaTransaction(
    planId: string,
    snapshotJson: Record<string, unknown>,
    changeSummary: string | null
  ): Promise<EquipmentPlanRow> {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("cancel_equipment_plan", {
      p_plan_id: planId,
      p_snapshot_json: snapshotJson,
      p_change_summary: changeSummary,
    });
    if (error) throw error;
    return data;
  },
};
