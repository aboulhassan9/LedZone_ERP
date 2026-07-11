import "server-only";
import { createClient } from "@/lib/supabase/server";

export type WarehouseLocationCodeRow = {
  id: string;
  warehouse_location_id: string;
  code_type: string;
  code_value: string;
  image_url: string | null;
  is_active: boolean;
  generated_at: string;
};

const COLUMNS = "id, warehouse_location_id, code_type, code_value, image_url, is_active, generated_at";

export const warehouseLocationCodeRepository = {
  async findActiveByType(
    locationId: string,
    codeType: "qr" | "barcode"
  ): Promise<WarehouseLocationCodeRow | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("warehouse_location_codes")
      .select(COLUMNS)
      .eq("warehouse_location_id", locationId)
      .eq("code_type", codeType)
      .eq("is_active", true)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async findActiveForLocation(locationId: string): Promise<WarehouseLocationCodeRow[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("warehouse_location_codes")
      .select(COLUMNS)
      .eq("warehouse_location_id", locationId)
      .eq("is_active", true);
    if (error) throw error;
    return data ?? [];
  },

  async findActiveForLocations(locationIds: string[]): Promise<WarehouseLocationCodeRow[]> {
    if (locationIds.length === 0) return [];
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("warehouse_location_codes")
      .select(COLUMNS)
      .in("warehouse_location_id", locationIds)
      .eq("is_active", true);
    if (error) throw error;
    return data ?? [];
  },

  // Resolves a scanned code value back to the location it identifies — the code's
  // code_value is the location's full_code (see warehouse-location-code-service.ts).
  async findByCodeValue(codeValue: string): Promise<WarehouseLocationCodeRow | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("warehouse_location_codes")
      .select(COLUMNS)
      .eq("code_value", codeValue)
      .eq("is_active", true)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  // Transactional: supersedes the old active code of this type and inserts the new one.
  async assignViaTransaction(
    locationId: string,
    codeType: "qr" | "barcode",
    codeValue: string,
    imageUrl: string | null
  ): Promise<WarehouseLocationCodeRow> {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("assign_warehouse_location_code", {
      p_location_id: locationId,
      p_code_type: codeType,
      p_code_value: codeValue,
      p_image_url: imageUrl,
    });
    if (error) throw error;
    return data;
  },
};
