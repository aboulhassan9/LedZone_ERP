import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { CreateWarehouseInput, UpdateWarehouseInput } from "@/modules/warehouse/schemas/warehouse-schema";

export type WarehouseRow = {
  id: string;
  location_id: string | null;
  name: string;
  code: string;
  description: string | null;
  warehouse_type: string;
  address: string | null;
  gps_lat: number | null;
  gps_lng: number | null;
  manager_id: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  capacity_volume_m3: number | null;
  capacity_weight_kg: number | null;
  is_default: boolean;
  is_active: boolean;
  status: string;
};

const COLUMNS =
  "id, location_id, name, code, description, warehouse_type, address, gps_lat, gps_lng, manager_id, contact_phone, contact_email, capacity_volume_m3, capacity_weight_kg, is_default, is_active, status";

export const warehouseRepository = {
  async findById(id: string): Promise<WarehouseRow | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("warehouses")
      .select(COLUMNS)
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async create(input: CreateWarehouseInput, userId: string): Promise<WarehouseRow> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("warehouses")
      .insert({
        location_id: input.locationId ?? null,
        name: input.name,
        code: input.code,
        description: input.description,
        warehouse_type: input.warehouseType,
        address: input.address,
        gps_lat: input.gpsLat,
        gps_lng: input.gpsLng,
        manager_id: input.managerId,
        contact_phone: input.contactPhone,
        contact_email: input.contactEmail,
        capacity_volume_m3: input.capacityVolumeM3,
        capacity_weight_kg: input.capacityWeightKg,
        is_default: input.isDefault,
        created_by: userId,
        updated_by: userId,
      })
      .select(COLUMNS)
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: string, input: UpdateWarehouseInput, userId: string): Promise<WarehouseRow> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("warehouses")
      .update({
        location_id: input.locationId,
        name: input.name,
        code: input.code,
        description: input.description,
        warehouse_type: input.warehouseType,
        address: input.address,
        gps_lat: input.gpsLat,
        gps_lng: input.gpsLng,
        manager_id: input.managerId,
        contact_phone: input.contactPhone,
        contact_email: input.contactEmail,
        capacity_volume_m3: input.capacityVolumeM3,
        capacity_weight_kg: input.capacityWeightKg,
        is_active: input.isActive,
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
      .from("warehouses")
      .update({
        status: "inactive",
        is_active: false,
        is_default: false,
        deleted_at: new Date().toISOString(),
        deleted_by: userId,
      })
      .eq("id", id);
    if (error) throw error;
  },

  // Two sequential updates, not a single transaction — a brief window with no default
  // warehouse is harmless (nothing reads "the default" mid-request), unlike equipment
  // location/status changes which always go through a single atomic RPC.
  async setDefault(id: string, userId: string): Promise<WarehouseRow> {
    const supabase = await createClient();

    const { error: clearError } = await supabase
      .from("warehouses")
      .update({ is_default: false, updated_by: userId })
      .eq("is_default", true)
      .neq("id", id);
    if (clearError) throw clearError;

    const { data, error } = await supabase
      .from("warehouses")
      .update({ is_default: true, updated_by: userId })
      .eq("id", id)
      .select(COLUMNS)
      .single();
    if (error) throw error;
    return data;
  },
};
