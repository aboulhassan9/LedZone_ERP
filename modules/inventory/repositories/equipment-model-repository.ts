import "server-only";
import { createClient } from "@/lib/supabase/server";
import type {
  CreateEquipmentModelInput,
  UpdateEquipmentModelInput,
} from "@/modules/inventory/schemas/equipment-model-schema";

export type EquipmentModelRow = {
  id: string;
  category_id: string;
  manufacturer_id: string;
  brand_id: string | null;
  model_name: string;
  model_number: string | null;
  description: string | null;
  tracking_type: string;
  specifications: Record<string, unknown>;
  default_warranty_months: number | null;
  expected_lifespan_months: number | null;
  image_url: string | null;
  status: string;
};

const COLUMNS =
  "id, category_id, manufacturer_id, brand_id, model_name, model_number, description, tracking_type, specifications, default_warranty_months, expected_lifespan_months, image_url, status";

export const equipmentModelRepository = {
  async findById(id: string): Promise<EquipmentModelRow | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("equipment_models")
      .select(COLUMNS)
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async create(input: CreateEquipmentModelInput, userId: string): Promise<EquipmentModelRow> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("equipment_models")
      .insert({
        category_id: input.categoryId,
        manufacturer_id: input.manufacturerId,
        brand_id: input.brandId ?? null,
        model_name: input.modelName,
        model_number: input.modelNumber,
        description: input.description,
        tracking_type: input.trackingType,
        specifications: input.specifications,
        default_warranty_months: input.defaultWarrantyMonths,
        expected_lifespan_months: input.expectedLifespanMonths,
        image_url: input.imageUrl,
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
    input: UpdateEquipmentModelInput,
    userId: string
  ): Promise<EquipmentModelRow> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("equipment_models")
      .update({
        category_id: input.categoryId,
        manufacturer_id: input.manufacturerId,
        brand_id: input.brandId,
        model_name: input.modelName,
        model_number: input.modelNumber,
        description: input.description,
        specifications: input.specifications,
        default_warranty_months: input.defaultWarrantyMonths,
        expected_lifespan_months: input.expectedLifespanMonths,
        image_url: input.imageUrl,
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
      .from("equipment_models")
      .update({ status: "inactive", deleted_at: new Date().toISOString(), deleted_by: userId })
      .eq("id", id);
    if (error) throw error;
  },
};
