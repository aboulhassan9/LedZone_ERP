import "server-only";
import { createClient } from "@/lib/supabase/server";
import type {
  CreateEquipmentCategoryInput,
  UpdateEquipmentCategoryInput,
} from "@/modules/inventory/schemas/reference-data-schemas";

export type EquipmentCategoryRow = {
  id: string;
  parent_id: string | null;
  name: string;
  description: string | null;
  icon: string | null;
  status: string;
};

// Pure data access — no permission checks or audit logging. That's the service layer's job.
export const equipmentCategoryRepository = {
  async findById(id: string): Promise<EquipmentCategoryRow | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("equipment_categories")
      .select("id, parent_id, name, description, icon, status")
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async create(
    input: CreateEquipmentCategoryInput,
    userId: string
  ): Promise<EquipmentCategoryRow> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("equipment_categories")
      .insert({
        parent_id: input.parentId ?? null,
        name: input.name,
        description: input.description,
        icon: input.icon,
        created_by: userId,
        updated_by: userId,
      })
      .select("id, parent_id, name, description, icon, status")
      .single();
    if (error) throw error;
    return data;
  },

  async update(
    id: string,
    input: UpdateEquipmentCategoryInput,
    userId: string
  ): Promise<EquipmentCategoryRow> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("equipment_categories")
      .update({ ...input, parent_id: input.parentId, updated_by: userId })
      .eq("id", id)
      .select("id, parent_id, name, description, icon, status")
      .single();
    if (error) throw error;
    return data;
  },

  async archive(id: string, userId: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase
      .from("equipment_categories")
      .update({ status: "inactive", deleted_at: new Date().toISOString(), deleted_by: userId })
      .eq("id", id);
    if (error) throw error;
  },
};
