import "server-only";
import { createClient } from "@/lib/supabase/server";
import type {
  CreateInvoiceInput,
  UpdateInvoiceInput,
  RecordPaymentInput,
} from "@/modules/finance/schemas/invoice-schema";

export type InvoiceRow = {
  id: string;
  invoice_number: string;
  customer_id: string;
  event_id: string | null;
  rental_agreement_id: string | null;
  status: string;
  currency_code: string;
  issue_date: string;
  due_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type InvoiceLineItemRow = {
  id: string;
  invoice_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  notes: string | null;
};

export type InvoicePaymentRow = {
  id: string;
  invoice_id: string;
  amount: number;
  paid_at: string;
  method: string;
  reference: string | null;
  notes: string | null;
  created_at: string;
};

const INVOICE_COLUMNS =
  "id, invoice_number, customer_id, event_id, rental_agreement_id, status, currency_code, issue_date, due_date, notes, created_at, updated_at";
const LINE_ITEM_COLUMNS = "id, invoice_id, description, quantity, unit_price, notes";
const PAYMENT_COLUMNS = "id, invoice_id, amount, paid_at, method, reference, notes, created_at";

export const invoiceRepository = {
  async findById(id: string): Promise<InvoiceRow | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("invoices")
      .select(INVOICE_COLUMNS)
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async list(customerId?: string): Promise<InvoiceRow[]> {
    const supabase = await createClient();
    let query = supabase.from("invoices").select(INVOICE_COLUMNS).is("deleted_at", null);
    if (customerId) query = query.eq("customer_id", customerId);
    const { data, error } = await query.order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async generateInvoiceNumber(): Promise<string> {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("generate_invoice_number");
    if (error) throw error;
    return data;
  },

  async create(invoiceNumber: string, input: CreateInvoiceInput, userId: string): Promise<InvoiceRow> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("invoices")
      .insert({
        invoice_number: invoiceNumber,
        customer_id: input.customerId,
        event_id: input.eventId ?? null,
        rental_agreement_id: input.rentalAgreementId ?? null,
        currency_code: input.currencyCode,
        issue_date: input.issueDate,
        due_date: input.dueDate ?? null,
        notes: input.notes ?? null,
        status: "draft",
        created_by: userId,
        updated_by: userId,
      })
      .select(INVOICE_COLUMNS)
      .single();
    if (error) throw error;
    return data;
  },

  async createLineItems(
    invoiceId: string,
    lineItems: CreateInvoiceInput["lineItems"]
  ): Promise<InvoiceLineItemRow[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("invoice_line_items")
      .insert(
        lineItems.map((li) => ({
          invoice_id: invoiceId,
          description: li.description,
          quantity: li.quantity,
          unit_price: li.unitPrice,
          notes: li.notes ?? null,
        }))
      )
      .select(LINE_ITEM_COLUMNS);
    if (error) throw error;
    return data ?? [];
  },

  async findLineItems(invoiceId: string): Promise<InvoiceLineItemRow[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("invoice_line_items")
      .select(LINE_ITEM_COLUMNS)
      .eq("invoice_id", invoiceId);
    if (error) throw error;
    return data ?? [];
  },

  async findPayments(invoiceId: string): Promise<InvoicePaymentRow[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("invoice_payments")
      .select(PAYMENT_COLUMNS)
      .eq("invoice_id", invoiceId)
      .order("paid_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async createPayment(
    invoiceId: string,
    input: RecordPaymentInput,
    userId: string
  ): Promise<InvoicePaymentRow> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("invoice_payments")
      .insert({
        invoice_id: invoiceId,
        amount: input.amount,
        paid_at: input.paidAt,
        method: input.method,
        reference: input.reference ?? null,
        notes: input.notes ?? null,
        created_by: userId,
      })
      .select(PAYMENT_COLUMNS)
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: string, input: UpdateInvoiceInput, userId: string): Promise<InvoiceRow> {
    const supabase = await createClient();
    const patch: Record<string, unknown> = { updated_by: userId };
    if (input.dueDate !== undefined) patch.due_date = input.dueDate;
    if (input.notes !== undefined) patch.notes = input.notes;

    const { data, error } = await supabase
      .from("invoices")
      .update(patch)
      .eq("id", id)
      .select(INVOICE_COLUMNS)
      .single();
    if (error) throw error;
    return data;
  },

  async setStatus(id: string, status: string, userId: string): Promise<InvoiceRow> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("invoices")
      .update({ status, updated_by: userId })
      .eq("id", id)
      .select(INVOICE_COLUMNS)
      .single();
    if (error) throw error;
    return data;
  },
};
