import "server-only";
import { createClient } from "@/lib/supabase/server";
import type {
  CreateRentalAgreementInput,
  UpdateRentalAgreementInput,
} from "@/modules/rental/schemas/rental-agreement-schema";

export type RentalAgreementRow = {
  id: string;
  agreement_number: string;
  customer_id: string;
  event_id: string | null;
  quote_id: string | null;
  status: string;
  currency_code: string;
  rental_start_at: string;
  rental_end_at: string;
  deposit_amount: number;
  deposit_status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type RentalAgreementLineItemRow = {
  id: string;
  agreement_id: string;
  model_id: string;
  quantity: number;
  daily_rate: number;
  notes: string | null;
};

const AGREEMENT_COLUMNS =
  "id, agreement_number, customer_id, event_id, quote_id, status, currency_code, rental_start_at, rental_end_at, deposit_amount, deposit_status, notes, created_at, updated_at";
const LINE_ITEM_COLUMNS = "id, agreement_id, model_id, quantity, daily_rate, notes";

export const rentalAgreementRepository = {
  async findById(id: string): Promise<RentalAgreementRow | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("rental_agreements")
      .select(AGREEMENT_COLUMNS)
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async list(customerId?: string): Promise<RentalAgreementRow[]> {
    const supabase = await createClient();
    let query = supabase.from("rental_agreements").select(AGREEMENT_COLUMNS).is("deleted_at", null);
    if (customerId) query = query.eq("customer_id", customerId);
    const { data, error } = await query.order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async generateAgreementNumber(): Promise<string> {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("generate_rental_agreement_number");
    if (error) throw error;
    return data;
  },

  async create(
    agreementNumber: string,
    input: CreateRentalAgreementInput,
    userId: string
  ): Promise<RentalAgreementRow> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("rental_agreements")
      .insert({
        agreement_number: agreementNumber,
        customer_id: input.customerId,
        event_id: input.eventId ?? null,
        quote_id: input.quoteId ?? null,
        currency_code: input.currencyCode,
        rental_start_at: input.rentalStartAt,
        rental_end_at: input.rentalEndAt,
        deposit_amount: input.depositAmount,
        notes: input.notes ?? null,
        status: "draft",
        created_by: userId,
        updated_by: userId,
      })
      .select(AGREEMENT_COLUMNS)
      .single();
    if (error) throw error;
    return data;
  },

  async createLineItems(
    agreementId: string,
    lineItems: CreateRentalAgreementInput["lineItems"]
  ): Promise<RentalAgreementLineItemRow[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("rental_agreement_line_items")
      .insert(
        lineItems.map((li) => ({
          agreement_id: agreementId,
          model_id: li.modelId,
          quantity: li.quantity,
          daily_rate: li.dailyRate,
          notes: li.notes ?? null,
        }))
      )
      .select(LINE_ITEM_COLUMNS);
    if (error) throw error;
    return data ?? [];
  },

  async findLineItems(agreementId: string): Promise<RentalAgreementLineItemRow[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("rental_agreement_line_items")
      .select(LINE_ITEM_COLUMNS)
      .eq("agreement_id", agreementId);
    if (error) throw error;
    return data ?? [];
  },

  async update(
    id: string,
    input: UpdateRentalAgreementInput,
    userId: string
  ): Promise<RentalAgreementRow> {
    const supabase = await createClient();
    const patch: Record<string, unknown> = { updated_by: userId };
    if (input.eventId !== undefined) patch.event_id = input.eventId;
    if (input.rentalStartAt !== undefined) patch.rental_start_at = input.rentalStartAt;
    if (input.rentalEndAt !== undefined) patch.rental_end_at = input.rentalEndAt;
    if (input.depositAmount !== undefined) patch.deposit_amount = input.depositAmount;
    if (input.notes !== undefined) patch.notes = input.notes;

    const { data, error } = await supabase
      .from("rental_agreements")
      .update(patch)
      .eq("id", id)
      .select(AGREEMENT_COLUMNS)
      .single();
    if (error) throw error;
    return data;
  },

  async setStatus(id: string, status: string, userId: string): Promise<RentalAgreementRow> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("rental_agreements")
      .update({ status, updated_by: userId })
      .eq("id", id)
      .select(AGREEMENT_COLUMNS)
      .single();
    if (error) throw error;
    return data;
  },

  async setDepositStatus(id: string, depositStatus: string, userId: string): Promise<RentalAgreementRow> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("rental_agreements")
      .update({ deposit_status: depositStatus, updated_by: userId })
      .eq("id", id)
      .select(AGREEMENT_COLUMNS)
      .single();
    if (error) throw error;
    return data;
  },
};
