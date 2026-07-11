import "server-only";
import { createClient } from "@/lib/supabase/server";

export type RevenueByCurrencyRow = { currencyCode: string; totalRevenue: number; invoiceCount: number };
export type ExpenseByCategoryRow = { category: string; currencyCode: string; totalAmount: number };

export const financialReportRepository = {
  async getRevenueByCurrency(): Promise<RevenueByCurrencyRow[]> {
    const supabase = await createClient();
    const { data: invoices, error: invoicesError } = await supabase
      .from("invoices")
      .select("id, currency_code")
      .eq("status", "paid")
      .is("deleted_at", null);
    if (invoicesError) throw invoicesError;

    const invoiceRows = invoices ?? [];
    if (invoiceRows.length === 0) return [];

    const { data: lineItems, error: lineItemsError } = await supabase
      .from("invoice_line_items")
      .select("invoice_id, quantity, unit_price")
      .in(
        "invoice_id",
        invoiceRows.map((i) => i.id)
      );
    if (lineItemsError) throw lineItemsError;

    const currencyByInvoice = new Map(invoiceRows.map((i) => [i.id, i.currency_code]));
    const totals = new Map<string, { revenue: number; invoiceIds: Set<string> }>();
    for (const li of lineItems ?? []) {
      const currencyCode = currencyByInvoice.get(li.invoice_id);
      if (!currencyCode) continue;
      const entry = totals.get(currencyCode) ?? { revenue: 0, invoiceIds: new Set<string>() };
      entry.revenue += li.quantity * li.unit_price;
      entry.invoiceIds.add(li.invoice_id);
      totals.set(currencyCode, entry);
    }

    return [...totals.entries()]
      .map(([currencyCode, entry]) => ({
        currencyCode,
        totalRevenue: entry.revenue,
        invoiceCount: entry.invoiceIds.size,
      }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue);
  },

  async getExpensesByCategory(): Promise<ExpenseByCategoryRow[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("expenses")
      .select("category, currency_code, amount")
      .in("status", ["approved", "paid"])
      .is("deleted_at", null);
    if (error) throw error;

    const totals = new Map<string, number>();
    for (const row of data ?? []) {
      const key = `${row.category}::${row.currency_code}`;
      totals.set(key, (totals.get(key) ?? 0) + row.amount);
    }

    return [...totals.entries()]
      .map(([key, totalAmount]) => {
        const [category, currencyCode] = key.split("::");
        return { category, currencyCode, totalAmount };
      })
      .sort((a, b) => b.totalAmount - a.totalAmount);
  },
};
