import "server-only";
import { createClient } from "@/lib/supabase/server";
import type {
  CreateSupplierInput,
  UpdateSupplierInput,
} from "@/modules/inventory/schemas/reference-data-schemas";

export type SupplierRow = {
  id: string;
  name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  country: string | null;
  preferred_currency: string | null;
  status: string;
};

const COLUMNS = "id, name, contact_name, email, phone, address, country, preferred_currency, status";

export const supplierRepository = {
  async findById(id: string): Promise<SupplierRow | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("suppliers")
      .select(COLUMNS)
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async create(input: CreateSupplierInput, userId: string): Promise<SupplierRow> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("suppliers")
      .insert({
        name: input.name,
        contact_name: input.contactName,
        email: input.email || null,
        phone: input.phone,
        address: input.address,
        country: input.country,
        preferred_currency: input.preferredCurrency,
        created_by: userId,
        updated_by: userId,
      })
      .select(COLUMNS)
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: string, input: UpdateSupplierInput, userId: string): Promise<SupplierRow> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("suppliers")
      .update({
        name: input.name,
        contact_name: input.contactName,
        email: input.email || undefined,
        phone: input.phone,
        address: input.address,
        country: input.country,
        preferred_currency: input.preferredCurrency,
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
      .from("suppliers")
      .update({ status: "inactive", deleted_at: new Date().toISOString(), deleted_by: userId })
      .eq("id", id);
    if (error) throw error;
  },
};
