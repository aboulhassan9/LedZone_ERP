import "server-only";
import { createClient } from "@/lib/supabase/server";
import type {
  CreateEquipmentItemInput,
  UpdateEquipmentItemInput,
} from "@/modules/inventory/schemas/equipment-item-schema";

export type EquipmentItemRow = {
  id: string;
  model_id: string;
  asset_tag: string;
  serial_number: string | null;
  purchase_id: string | null;
  current_status: string;
  current_condition: string;
  current_storage_location_id: string | null;
  notes: string | null;
};

export type EquipmentItemMovementRow = {
  id: string;
  item_id: string;
  from_storage_location_id: string | null;
  to_storage_location_id: string;
  movement_type: string;
  reference_note: string | null;
  moved_at: string;
};

const COLUMNS =
  "id, model_id, asset_tag, serial_number, purchase_id, current_status, current_condition, current_storage_location_id, notes";

export const equipmentItemRepository = {
  async findById(id: string): Promise<EquipmentItemRow | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("equipment_items")
      .select(COLUMNS)
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  // Transactional: creates the item, auto-generates its asset tag from the model's
  // category, and records an initial_placement movement — all in one Postgres function.
  async createViaTransaction(input: CreateEquipmentItemInput): Promise<EquipmentItemRow> {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("create_equipment_item", {
      p_model_id: input.modelId,
      p_serial_number: input.serialNumber ?? null,
      p_purchase_id: input.purchaseId ?? null,
      p_storage_location_id: input.storageLocationId ?? null,
      p_current_condition: input.currentCondition,
      p_notes: input.notes ?? null,
    });
    if (error) throw error;
    return data;
  },

  async update(
    id: string,
    input: UpdateEquipmentItemInput,
    userId: string
  ): Promise<EquipmentItemRow> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("equipment_items")
      .update({
        serial_number: input.serialNumber,
        current_condition: input.currentCondition,
        notes: input.notes,
        updated_by: userId,
      })
      .eq("id", id)
      .select(COLUMNS)
      .single();
    if (error) throw error;
    return data;
  },

  async archive(id: string, userId: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase
      .from("equipment_items")
      .update({
        current_status: "retired",
        deleted_at: new Date().toISOString(),
        deleted_by: userId,
      })
      .eq("id", id);
    if (error) throw error;
  },

  // Transactional: records the movement AND updates the item's location/status.
  async recordMovementViaTransaction(
    itemId: string,
    toStorageLocationId: string,
    movementType: "transfer" | "check_out" | "check_in",
    referenceNote: string | null
  ): Promise<EquipmentItemMovementRow> {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("record_equipment_item_movement", {
      p_item_id: itemId,
      p_to_storage_location_id: toStorageLocationId,
      p_movement_type: movementType,
      p_reference_note: referenceNote,
    });
    if (error) throw error;
    return data;
  },
};
