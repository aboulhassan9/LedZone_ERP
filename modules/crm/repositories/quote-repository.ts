import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { CreateQuoteInput, UpdateQuoteInput } from "@/modules/crm/schemas/quote-schema";

export type QuoteRow = {
  id: string;
  quote_number: string;
  customer_id: string;
  status: string;
  valid_until: string | null;
  currency_code: string;
  event_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type QuoteLineItemRow = {
  id: string;
  quote_id: string;
  model_id: string;
  quantity: number;
  unit_price: number;
  notes: string | null;
};

const QUOTE_COLUMNS =
  "id, quote_number, customer_id, status, valid_until, currency_code, event_id, notes, created_at, updated_at";
const LINE_ITEM_COLUMNS = "id, quote_id, model_id, quantity, unit_price, notes";

export const quoteRepository = {
  async findById(id: string): Promise<QuoteRow | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("quotes")
      .select(QUOTE_COLUMNS)
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async list(customerId?: string): Promise<QuoteRow[]> {
    const supabase = await createClient();
    let query = supabase.from("quotes").select(QUOTE_COLUMNS).is("deleted_at", null);
    if (customerId) query = query.eq("customer_id", customerId);
    const { data, error } = await query.order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async generateQuoteNumber(): Promise<string> {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("generate_quote_number");
    if (error) throw error;
    return data;
  },

  async create(quoteNumber: string, input: CreateQuoteInput, userId: string): Promise<QuoteRow> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("quotes")
      .insert({
        quote_number: quoteNumber,
        customer_id: input.customerId,
        currency_code: input.currencyCode,
        valid_until: input.validUntil ?? null,
        event_id: input.eventId ?? null,
        notes: input.notes ?? null,
        status: "draft",
        created_by: userId,
        updated_by: userId,
      })
      .select(QUOTE_COLUMNS)
      .single();
    if (error) throw error;
    return data;
  },

  async createLineItems(
    quoteId: string,
    lineItems: CreateQuoteInput["lineItems"]
  ): Promise<QuoteLineItemRow[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("quote_line_items")
      .insert(
        lineItems.map((li) => ({
          quote_id: quoteId,
          model_id: li.modelId,
          quantity: li.quantity,
          unit_price: li.unitPrice,
          notes: li.notes ?? null,
        }))
      )
      .select(LINE_ITEM_COLUMNS);
    if (error) throw error;
    return data ?? [];
  },

  async findLineItems(quoteId: string): Promise<QuoteLineItemRow[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("quote_line_items")
      .select(LINE_ITEM_COLUMNS)
      .eq("quote_id", quoteId);
    if (error) throw error;
    return data ?? [];
  },

  async update(id: string, input: UpdateQuoteInput, userId: string): Promise<QuoteRow> {
    const supabase = await createClient();
    const patch: Record<string, unknown> = { updated_by: userId };
    if (input.validUntil !== undefined) patch.valid_until = input.validUntil;
    if (input.eventId !== undefined) patch.event_id = input.eventId;
    if (input.notes !== undefined) patch.notes = input.notes;

    const { data, error } = await supabase
      .from("quotes")
      .update(patch)
      .eq("id", id)
      .select(QUOTE_COLUMNS)
      .single();
    if (error) throw error;
    return data;
  },

  async setStatus(id: string, status: string, userId: string): Promise<QuoteRow> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("quotes")
      .update({ status, updated_by: userId })
      .eq("id", id)
      .select(QUOTE_COLUMNS)
      .single();
    if (error) throw error;
    return data;
  },
};
