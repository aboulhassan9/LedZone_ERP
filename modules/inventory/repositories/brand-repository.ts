import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { CreateBrandInput, UpdateBrandInput } from "@/modules/inventory/schemas/reference-data-schemas";

export type BrandRow = {
  id: string;
  manufacturer_id: string | null;
  name: string;
  website: string | null;
  status: string;
};

const COLUMNS = "id, manufacturer_id, name, website, status";

export const brandRepository = {
  async findById(id: string): Promise<BrandRow | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("brands")
      .select(COLUMNS)
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async create(input: CreateBrandInput, userId: string): Promise<BrandRow> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("brands")
      .insert({
        manufacturer_id: input.manufacturerId ?? null,
        name: input.name,
        website: input.website || null,
        created_by: userId,
        updated_by: userId,
      })
      .select(COLUMNS)
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: string, input: UpdateBrandInput, userId: string): Promise<BrandRow> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("brands")
      .update({
        manufacturer_id: input.manufacturerId,
        name: input.name,
        website: input.website || undefined,
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
      .from("brands")
      .update({ status: "inactive", deleted_at: new Date().toISOString(), deleted_by: userId })
      .eq("id", id);
    if (error) throw error;
  },
};
