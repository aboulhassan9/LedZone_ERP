import "server-only";
import { createClient } from "@/lib/supabase/server";
import type {
  RegisterWarrantyInput,
  UpdateWarrantyInput,
} from "@/modules/inventory/schemas/warranty-schema";

export type EquipmentItemWarrantyRow = {
  id: string;
  item_id: string;
  purchase_id: string | null;
  provider_type: string;
  provider_name: string | null;
  warranty_type: string | null;
  start_date: string;
  end_date: string;
  terms: string | null;
  claim_contact: string | null;
  status: string;
};

const COLUMNS =
  "id, item_id, purchase_id, provider_type, provider_name, warranty_type, start_date, end_date, terms, claim_contact, status";

export const warrantyRepository = {
  async findById(id: string): Promise<EquipmentItemWarrantyRow | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("equipment_item_warranties")
      .select(COLUMNS)
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async create(input: RegisterWarrantyInput, userId: string): Promise<EquipmentItemWarrantyRow> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("equipment_item_warranties")
      .insert({
        item_id: input.itemId,
        purchase_id: input.purchaseId,
        provider_type: input.providerType,
        provider_name: input.providerName,
        warranty_type: input.warrantyType,
        start_date: input.startDate,
        end_date: input.endDate,
        terms: input.terms,
        claim_contact: input.claimContact,
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
    input: UpdateWarrantyInput,
    userId: string
  ): Promise<EquipmentItemWarrantyRow> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("equipment_item_warranties")
      .update({
        provider_name: input.providerName,
        warranty_type: input.warrantyType,
        terms: input.terms,
        claim_contact: input.claimContact,
        status: input.status,
        updated_by: userId,
      })
      .eq("id", id)
      .select(COLUMNS)
      .single();
    if (error) throw error;
    return data;
  },
};
