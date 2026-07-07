import "server-only";
import { createClient } from "@/lib/supabase/server";
import type {
  CreateWarehouseLocationInput,
  UpdateWarehouseLocationInput,
} from "@/modules/warehouse/schemas/warehouse-location-schema";

export type WarehouseLocationRow = {
  id: string;
  warehouse_id: string;
  parent_id: string | null;
  node_type: string;
  location_category: string | null;
  code: string;
  full_code: string | null;
  name: string | null;
  capacity_units: number | null;
  weight_limit_kg: number | null;
  length_cm: number | null;
  width_cm: number | null;
  height_cm: number | null;
  is_placeable: boolean;
  status: string;
};

const COLUMNS =
  "id, warehouse_id, parent_id, node_type, location_category, code, full_code, name, capacity_units, weight_limit_kg, length_cm, width_cm, height_cm, is_placeable, status";

export const warehouseLocationRepository = {
  async findById(id: string): Promise<WarehouseLocationRow | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("warehouse_locations")
      .select(COLUMNS)
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async findByWarehouseId(warehouseId: string): Promise<WarehouseLocationRow[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("warehouse_locations")
      .select(COLUMNS)
      .eq("warehouse_id", warehouseId)
      .is("deleted_at", null)
      .order("full_code");
    if (error) throw error;
    return data ?? [];
  },

  async create(input: CreateWarehouseLocationInput, userId: string): Promise<WarehouseLocationRow> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("warehouse_locations")
      .insert({
        warehouse_id: input.warehouseId,
        parent_id: input.parentId ?? null,
        node_type: input.nodeType,
        location_category: input.locationCategory,
        code: input.code,
        name: input.name,
        capacity_units: input.capacityUnits,
        weight_limit_kg: input.weightLimitKg,
        length_cm: input.lengthCm,
        width_cm: input.widthCm,
        height_cm: input.heightCm,
        created_by: userId,
        updated_by: userId,
      })
      .select(COLUMNS)
      .single();
    if (error) throw error;
    return data;
  },

  async update(
    id: string,
    input: UpdateWarehouseLocationInput,
    userId: string
  ): Promise<WarehouseLocationRow> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("warehouse_locations")
      .update({
        location_category: input.locationCategory,
        name: input.name,
        capacity_units: input.capacityUnits,
        weight_limit_kg: input.weightLimitKg,
        length_cm: input.lengthCm,
        width_cm: input.widthCm,
        height_cm: input.heightCm,
        status: input.status,
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
      .from("warehouse_locations")
      .update({ status: "inactive", deleted_at: new Date().toISOString(), deleted_by: userId })
      .eq("id", id);
    if (error) throw error;
  },

  // Pure lookup — no side effects, no permission gate needed (it's not a mutation).
  async findBridgedStorageLocationId(warehouseLocationId: string): Promise<string | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("storage_locations")
      .select("id")
      .eq("warehouse_location_id", warehouseLocationId)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw error;
    return data?.id ?? null;
  },

  // Auto-provisions the storage_locations bridge row Module 3.1 deliberately deferred to
  // this layer. Requires the warehouse to have a Module 1 location_id — a warehouse with no
  // physical site can't back a storage_locations row (location_id there is NOT NULL).
  async createStorageLocationBridge(
    warehouseLocationId: string,
    moduleLocationId: string,
    name: string,
    code: string,
    userId: string
  ): Promise<string> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("storage_locations")
      .insert({
        location_id: moduleLocationId,
        name,
        code,
        warehouse_location_id: warehouseLocationId,
        created_by: userId,
        updated_by: userId,
      })
      .select("id")
      .single();
    if (error) throw error;
    return data.id;
  },

  async findOccupancy(warehouseLocationId: string): Promise<{
    capacity_units: number | null;
    occupied_units: number;
  } | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("warehouse_location_occupancy")
      .select("capacity_units, occupied_units")
      .eq("warehouse_location_id", warehouseLocationId)
      .maybeSingle();
    if (error) throw error;
    return data;
  },
};
