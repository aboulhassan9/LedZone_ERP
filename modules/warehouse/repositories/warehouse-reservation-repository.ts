import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { CreateReservationInput } from "@/modules/warehouse/schemas/warehouse-reservation-schema";

export type WarehouseReservationRow = {
  id: string;
  warehouse_location_id: string | null;
  item_id: string | null;
  reserved_for_type: string;
  reserved_by: string | null;
  reserved_at: string;
  expires_at: string;
  released_at: string | null;
  reference_note: string | null;
};

const COLUMNS =
  "id, warehouse_location_id, item_id, reserved_for_type, reserved_by, reserved_at, expires_at, released_at, reference_note";

export const warehouseReservationRepository = {
  async findById(id: string): Promise<WarehouseReservationRow | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("warehouse_reservations")
      .select(COLUMNS)
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  // Active = not released and not yet expired — the "double booking" check reads this.
  async findActiveForLocation(warehouseLocationId: string): Promise<WarehouseReservationRow[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("warehouse_reservations")
      .select(COLUMNS)
      .eq("warehouse_location_id", warehouseLocationId)
      .is("released_at", null)
      .gt("expires_at", new Date().toISOString());
    if (error) throw error;
    return data ?? [];
  },

  async findActiveForItem(itemId: string): Promise<WarehouseReservationRow[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("warehouse_reservations")
      .select(COLUMNS)
      .eq("item_id", itemId)
      .is("released_at", null)
      .gt("expires_at", new Date().toISOString());
    if (error) throw error;
    return data ?? [];
  },

  async create(input: CreateReservationInput, userId: string): Promise<WarehouseReservationRow> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("warehouse_reservations")
      .insert({
        warehouse_location_id: input.warehouseLocationId,
        item_id: input.itemId,
        reserved_for_type: input.reservedForType,
        reserved_by: userId,
        expires_at: input.expiresAt,
        reference_note: input.referenceNote,
      })
      .select(COLUMNS)
      .single();
    if (error) throw error;
    return data;
  },

  async release(id: string): Promise<WarehouseReservationRow> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("warehouse_reservations")
      .update({ released_at: new Date().toISOString() })
      .eq("id", id)
      .select(COLUMNS)
      .single();
    if (error) throw error;
    return data;
  },
};
