import "server-only";
import { createClient } from "@/lib/supabase/server";
import type {
  CreateManufacturerInput,
  UpdateManufacturerInput,
} from "@/modules/inventory/schemas/reference-data-schemas";

export type ManufacturerRow = {
  id: string;
  name: string;
  country: string | null;
  website: string | null;
  support_email: string | null;
  support_phone: string | null;
  status: string;
};

const COLUMNS = "id, name, country, website, support_email, support_phone, status";

export const manufacturerRepository = {
  async findById(id: string): Promise<ManufacturerRow | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("manufacturers")
      .select(COLUMNS)
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async create(input: CreateManufacturerInput, userId: string): Promise<ManufacturerRow> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("manufacturers")
      .insert({
        name: input.name,
        country: input.country,
        website: input.website || null,
        support_email: input.supportEmail || null,
        support_phone: input.supportPhone,
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
    input: UpdateManufacturerInput,
    userId: string
  ): Promise<ManufacturerRow> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("manufacturers")
      .update({
        name: input.name,
        country: input.country,
        website: input.website || undefined,
        support_email: input.supportEmail || undefined,
        support_phone: input.supportPhone,
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
      .from("manufacturers")
      .update({ status: "inactive", deleted_at: new Date().toISOString(), deleted_by: userId })
      .eq("id", id);
    if (error) throw error;
  },
};
