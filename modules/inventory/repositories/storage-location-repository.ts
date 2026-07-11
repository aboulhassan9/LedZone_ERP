import "server-only";
import { createClient } from "@/lib/supabase/server";
import type {
  CreateStorageLocationInput,
  UpdateStorageLocationInput,
} from "@/modules/inventory/schemas/reference-data-schemas";

export type StorageLocationRow = {
  id: string;
  location_id: string;
  name: string;
  code: string | null;
  status: string;
};

const COLUMNS = "id, location_id, name, code, status";

export const storageLocationRepository = {
  async findById(id: string): Promise<StorageLocationRow | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("storage_locations")
      .select(COLUMNS)
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async create(input: CreateStorageLocationInput, userId: string): Promise<StorageLocationRow> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("storage_locations")
      .insert({
        location_id: input.locationId,
        name: input.name,
        code: input.code,
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
    input: UpdateStorageLocationInput,
    userId: string
  ): Promise<StorageLocationRow> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("storage_locations")
      .update({
        location_id: input.locationId,
        name: input.name,
        code: input.code,
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
      .from("storage_locations")
      .update({ status: "inactive", deleted_at: new Date().toISOString(), deleted_by: userId })
      .eq("id", id);
    if (error) throw error;
  },
};
