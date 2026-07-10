import "server-only";
import { createClient } from "@/lib/supabase/server";
import type {
  CreateCustomerInput,
  UpdateCustomerInput,
  ListCustomersInput,
  CreateCustomerContactInput,
  UpdateCustomerContactInput,
} from "@/modules/crm/schemas/customer-schema";

export type CustomerRow = {
  id: string;
  customer_type: string;
  lifecycle_stage: string;
  company_name: string | null;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  billing_address: string | null;
  tax_id: string | null;
  source: string | null;
  assigned_to: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type CustomerContactRow = {
  id: string;
  customer_id: string;
  full_name: string;
  role: string | null;
  email: string | null;
  phone: string | null;
  is_primary: boolean;
};

const CUSTOMER_COLUMNS =
  "id, customer_type, lifecycle_stage, company_name, full_name, email, phone, billing_address, tax_id, source, assigned_to, notes, created_at, updated_at";
const CONTACT_COLUMNS = "id, customer_id, full_name, role, email, phone, is_primary";

export const customerRepository = {
  async findById(id: string): Promise<CustomerRow | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("customers")
      .select(CUSTOMER_COLUMNS)
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async list(filters: ListCustomersInput): Promise<CustomerRow[]> {
    const supabase = await createClient();
    let query = supabase.from("customers").select(CUSTOMER_COLUMNS).is("deleted_at", null);
    if (filters.lifecycleStage) query = query.eq("lifecycle_stage", filters.lifecycleStage);
    const { data, error } = await query.order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async create(input: CreateCustomerInput, userId: string): Promise<CustomerRow> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("customers")
      .insert({
        customer_type: input.customerType,
        lifecycle_stage: input.lifecycleStage,
        company_name: input.companyName ?? null,
        full_name: input.fullName ?? null,
        email: input.email ?? null,
        phone: input.phone ?? null,
        billing_address: input.billingAddress ?? null,
        tax_id: input.taxId ?? null,
        source: input.source ?? null,
        assigned_to: input.assignedTo ?? null,
        notes: input.notes ?? null,
        created_by: userId,
        updated_by: userId,
      })
      .select(CUSTOMER_COLUMNS)
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: string, input: UpdateCustomerInput, userId: string): Promise<CustomerRow> {
    const supabase = await createClient();
    const patch: Record<string, unknown> = { updated_by: userId };
    if (input.lifecycleStage !== undefined) patch.lifecycle_stage = input.lifecycleStage;
    if (input.companyName !== undefined) patch.company_name = input.companyName;
    if (input.fullName !== undefined) patch.full_name = input.fullName;
    if (input.email !== undefined) patch.email = input.email;
    if (input.phone !== undefined) patch.phone = input.phone;
    if (input.billingAddress !== undefined) patch.billing_address = input.billingAddress;
    if (input.taxId !== undefined) patch.tax_id = input.taxId;
    if (input.source !== undefined) patch.source = input.source;
    if (input.assignedTo !== undefined) patch.assigned_to = input.assignedTo;
    if (input.notes !== undefined) patch.notes = input.notes;

    const { data, error } = await supabase
      .from("customers")
      .update(patch)
      .eq("id", id)
      .select(CUSTOMER_COLUMNS)
      .single();
    if (error) throw error;
    return data;
  },

  async softDelete(id: string, userId: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase
      .from("customers")
      .update({ deleted_at: new Date().toISOString(), deleted_by: userId })
      .eq("id", id);
    if (error) throw error;
  },

  async findContacts(customerId: string): Promise<CustomerContactRow[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("customer_contacts")
      .select(CONTACT_COLUMNS)
      .eq("customer_id", customerId)
      .order("is_primary", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async createContact(
    customerId: string,
    input: CreateCustomerContactInput,
    userId: string
  ): Promise<CustomerContactRow> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("customer_contacts")
      .insert({
        customer_id: customerId,
        full_name: input.fullName,
        role: input.role ?? null,
        email: input.email ?? null,
        phone: input.phone ?? null,
        is_primary: input.isPrimary,
        created_by: userId,
        updated_by: userId,
      })
      .select(CONTACT_COLUMNS)
      .single();
    if (error) throw error;
    return data;
  },

  async updateContact(
    id: string,
    input: UpdateCustomerContactInput,
    userId: string
  ): Promise<CustomerContactRow> {
    const supabase = await createClient();
    const patch: Record<string, unknown> = { updated_by: userId };
    if (input.fullName !== undefined) patch.full_name = input.fullName;
    if (input.role !== undefined) patch.role = input.role;
    if (input.email !== undefined) patch.email = input.email;
    if (input.phone !== undefined) patch.phone = input.phone;
    if (input.isPrimary !== undefined) patch.is_primary = input.isPrimary;

    const { data, error } = await supabase
      .from("customer_contacts")
      .update(patch)
      .eq("id", id)
      .select(CONTACT_COLUMNS)
      .single();
    if (error) throw error;
    return data;
  },

  async deleteContact(id: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("customer_contacts").delete().eq("id", id);
    if (error) throw error;
  },
};
