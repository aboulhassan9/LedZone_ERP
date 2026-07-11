import "server-only";
import { createClient } from "@/lib/supabase/server";
import type {
  CreateExpenseInput,
  UpdateExpenseInput,
  ListExpensesInput,
} from "@/modules/finance/schemas/expense-schema";

export type ExpenseRow = {
  id: string;
  category: string;
  description: string;
  amount: number;
  currency_code: string;
  expense_date: string;
  event_id: string | null;
  vendor: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

const EXPENSE_COLUMNS =
  "id, category, description, amount, currency_code, expense_date, event_id, vendor, status, notes, created_at, updated_at";

export const expenseRepository = {
  async findById(id: string): Promise<ExpenseRow | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("expenses")
      .select(EXPENSE_COLUMNS)
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async list(filters: ListExpensesInput): Promise<ExpenseRow[]> {
    const supabase = await createClient();
    let query = supabase.from("expenses").select(EXPENSE_COLUMNS).is("deleted_at", null);
    if (filters.status) query = query.eq("status", filters.status);
    if (filters.category) query = query.eq("category", filters.category);
    const { data, error } = await query.order("expense_date", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async create(input: CreateExpenseInput, userId: string): Promise<ExpenseRow> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("expenses")
      .insert({
        category: input.category,
        description: input.description,
        amount: input.amount,
        currency_code: input.currencyCode,
        expense_date: input.expenseDate,
        event_id: input.eventId ?? null,
        vendor: input.vendor ?? null,
        notes: input.notes ?? null,
        status: "draft",
        created_by: userId,
        updated_by: userId,
      })
      .select(EXPENSE_COLUMNS)
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: string, input: UpdateExpenseInput, userId: string): Promise<ExpenseRow> {
    const supabase = await createClient();
    const patch: Record<string, unknown> = { updated_by: userId };
    if (input.category !== undefined) patch.category = input.category;
    if (input.description !== undefined) patch.description = input.description;
    if (input.amount !== undefined) patch.amount = input.amount;
    if (input.expenseDate !== undefined) patch.expense_date = input.expenseDate;
    if (input.eventId !== undefined) patch.event_id = input.eventId;
    if (input.vendor !== undefined) patch.vendor = input.vendor;
    if (input.notes !== undefined) patch.notes = input.notes;

    const { data, error } = await supabase
      .from("expenses")
      .update(patch)
      .eq("id", id)
      .select(EXPENSE_COLUMNS)
      .single();
    if (error) throw error;
    return data;
  },

  async setStatus(id: string, status: string, userId: string): Promise<ExpenseRow> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("expenses")
      .update({ status, updated_by: userId })
      .eq("id", id)
      .select(EXPENSE_COLUMNS)
      .single();
    if (error) throw error;
    return data;
  },

  async softDelete(id: string, userId: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase
      .from("expenses")
      .update({ deleted_at: new Date().toISOString(), deleted_by: userId })
      .eq("id", id);
    if (error) throw error;
  },
};
