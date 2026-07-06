import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { RegisterPurchaseInput, UpdatePurchaseInput } from "@/modules/inventory/schemas/purchase-schema";

export type EquipmentPurchaseRow = {
  id: string;
  supplier_id: string;
  purchase_date: string;
  invoice_number: string | null;
  currency_code: string;
  exchange_rate_id: string | null;
  subtotal_amount: number | null;
  tax_amount: number | null;
  total_amount: number;
  status: string;
  notes: string | null;
};

const COLUMNS =
  "id, supplier_id, purchase_date, invoice_number, currency_code, exchange_rate_id, subtotal_amount, tax_amount, total_amount, status, notes";

export const purchaseRepository = {
  async findById(id: string): Promise<EquipmentPurchaseRow | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("equipment_purchases")
      .select(COLUMNS)
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async create(input: RegisterPurchaseInput, userId: string): Promise<EquipmentPurchaseRow> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("equipment_purchases")
      .insert({
        supplier_id: input.supplierId,
        purchase_date: input.purchaseDate,
        invoice_number: input.invoiceNumber,
        currency_code: input.currencyCode,
        exchange_rate_id: input.exchangeRateId,
        subtotal_amount: input.subtotalAmount,
        tax_amount: input.taxAmount,
        total_amount: input.totalAmount,
        status: input.status,
        notes: input.notes,
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
    input: UpdatePurchaseInput,
    userId: string
  ): Promise<EquipmentPurchaseRow> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("equipment_purchases")
      .update({
        supplier_id: input.supplierId,
        purchase_date: input.purchaseDate,
        invoice_number: input.invoiceNumber,
        currency_code: input.currencyCode,
        exchange_rate_id: input.exchangeRateId,
        subtotal_amount: input.subtotalAmount,
        tax_amount: input.taxAmount,
        total_amount: input.totalAmount,
        status: input.status,
        notes: input.notes,
        updated_by: userId,
      })
      .eq("id", id)
      .select(COLUMNS)
      .single();
    if (error) throw error;
    return data;
  },
};
