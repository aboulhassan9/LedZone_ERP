import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export type FinancialReportRow = {
  id: string;
  period_type: string;
  period_start: string;
  period_end: string;
  currency_code: string;
  total_income: number;
  total_expenses: number;
  net_amount: number;
  payment_count: number;
  expense_count: number;
  generated_at: string;
  generated_by: string | null;
  notes: string | null;
};

const REPORT_COLUMNS =
  "id, period_type, period_start, period_end, currency_code, total_income, total_expenses, net_amount, payment_count, expense_count, generated_at, generated_by, notes";

// computeAndStore takes an already-constructed SupabaseClient rather than instantiating its
// own -- the one deliberate deviation from this codebase's usual "repository owns its client"
// convention. It must run under two different identities: an authenticated user (manual
// generation, RLS-checked) and the service-role client (cron-triggered, no user session to
// check a policy against -- same pattern lib/services/notification-service.ts already uses).
// A single aggregation query written once, callable from either path, beats duplicating it.
export const financialSnapshotRepository = {
  async list(): Promise<FinancialReportRow[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("financial_reports")
      .select(REPORT_COLUMNS)
      .order("period_start", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async findById(id: string): Promise<FinancialReportRow | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("financial_reports")
      .select(REPORT_COLUMNS)
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async computeAndStore(
    supabase: SupabaseClient,
    periodType: "weekly" | "monthly",
    periodStart: string,
    periodEnd: string,
    generatedBy: string | null
  ): Promise<FinancialReportRow[]> {
    const [{ data: payments, error: paymentsError }, { data: expenses, error: expensesError }] = await Promise.all([
      supabase
        .from("invoice_payments")
        .select("amount, paid_at, invoices!inner(currency_code)")
        .gte("paid_at", periodStart)
        .lt("paid_at", nextDay(periodEnd)),
      supabase
        .from("expenses")
        .select("amount, currency_code")
        .in("status", ["approved", "paid"])
        .gte("expense_date", periodStart)
        .lte("expense_date", periodEnd)
        .is("deleted_at", null),
    ]);
    if (paymentsError) throw paymentsError;
    if (expensesError) throw expensesError;

    type PaymentRow = { amount: number; invoices: { currency_code: string } | { currency_code: string }[] };
    const totals = new Map<string, { income: number; expenses: number; paymentCount: number; expenseCount: number }>();

    for (const payment of (payments ?? []) as PaymentRow[]) {
      const invoice = Array.isArray(payment.invoices) ? payment.invoices[0] : payment.invoices;
      if (!invoice) continue;
      const entry = totals.get(invoice.currency_code) ?? { income: 0, expenses: 0, paymentCount: 0, expenseCount: 0 };
      entry.income += payment.amount;
      entry.paymentCount += 1;
      totals.set(invoice.currency_code, entry);
    }

    for (const expense of expenses ?? []) {
      const entry = totals.get(expense.currency_code) ?? { income: 0, expenses: 0, paymentCount: 0, expenseCount: 0 };
      entry.expenses += expense.amount;
      entry.expenseCount += 1;
      totals.set(expense.currency_code, entry);
    }

    if (totals.size === 0) return [];

    const rows = [...totals.entries()].map(([currencyCode, entry]) => ({
      period_type: periodType,
      period_start: periodStart,
      period_end: periodEnd,
      currency_code: currencyCode,
      total_income: entry.income,
      total_expenses: entry.expenses,
      net_amount: entry.income - entry.expenses,
      payment_count: entry.paymentCount,
      expense_count: entry.expenseCount,
      generated_by: generatedBy,
    }));

    const { data, error } = await supabase
      .from("financial_reports")
      .upsert(rows, { onConflict: "period_type,period_start,period_end,currency_code" })
      .select(REPORT_COLUMNS);
    if (error) throw error;
    return data ?? [];
  },
};

function nextDay(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}
