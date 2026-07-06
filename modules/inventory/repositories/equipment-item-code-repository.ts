import "server-only";
import { createClient } from "@/lib/supabase/server";

export type EquipmentItemCodeRow = {
  id: string;
  item_id: string;
  code_type: string;
  code_value: string;
  image_url: string | null;
  is_active: boolean;
  generated_at: string;
};

export const equipmentItemCodeRepository = {
  async findActiveByType(
    itemId: string,
    codeType: "qr" | "barcode"
  ): Promise<EquipmentItemCodeRow | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("equipment_item_codes")
      .select("id, item_id, code_type, code_value, image_url, is_active, generated_at")
      .eq("item_id", itemId)
      .eq("code_type", codeType)
      .eq("is_active", true)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  // Transactional: supersedes the old active code of this type and inserts the new one.
  async assignViaTransaction(
    itemId: string,
    codeType: "qr" | "barcode",
    codeValue: string,
    imageUrl: string | null
  ): Promise<EquipmentItemCodeRow> {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("assign_equipment_item_code", {
      p_item_id: itemId,
      p_code_type: codeType,
      p_code_value: codeValue,
      p_image_url: imageUrl,
    });
    if (error) throw error;
    return data;
  },
};
