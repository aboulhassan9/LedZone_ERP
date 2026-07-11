import "server-only";
import { createClient } from "@/lib/supabase/server";

export type EventProfitabilityRow = {
  eventId: string;
  eventName: string;
  currencyCode: string;
  revenue: number;
  expenses: number;
  profit: number;
};

// Revenue and cost are only ever meaningfully compared within the same currency -- an event
// billed in USD with a CDF expense logged against it gets two separate rows, not a naive sum
// across currencies (which lib/exchange-rate exists to convert deliberately, not silently here).
export const eventProfitabilityReportRepository = {
  async list(): Promise<EventProfitabilityRow[]> {
    const supabase = await createClient();
    const [{ data: events, error: eventsError }, { data: invoices, error: invoicesError }, { data: expenses, error: expensesError }] =
      await Promise.all([
        supabase.from("events").select("id, name").is("deleted_at", null),
        supabase
          .from("invoices")
          .select("id, event_id, currency_code")
          .eq("status", "paid")
          .not("event_id", "is", null)
          .is("deleted_at", null),
        supabase
          .from("expenses")
          .select("event_id, currency_code, amount")
          .in("status", ["approved", "paid"])
          .not("event_id", "is", null)
          .is("deleted_at", null),
      ]);
    if (eventsError) throw eventsError;
    if (invoicesError) throw invoicesError;
    if (expensesError) throw expensesError;

    const invoiceRows = invoices ?? [];
    const { data: lineItems, error: lineItemsError } = invoiceRows.length
      ? await supabase
          .from("invoice_line_items")
          .select("invoice_id, quantity, unit_price")
          .in(
            "invoice_id",
            invoiceRows.map((i) => i.id)
          )
      : { data: [], error: null };
    if (lineItemsError) throw lineItemsError;

    const invoiceById = new Map(invoiceRows.map((i) => [i.id, i]));
    const eventNameById = new Map((events ?? []).map((e) => [e.id, e.name]));

    const totals = new Map<string, { revenue: number; expenses: number }>();
    const keyFor = (eventId: string, currencyCode: string) => `${eventId}::${currencyCode}`;

    for (const li of lineItems ?? []) {
      const invoice = invoiceById.get(li.invoice_id);
      if (!invoice || !invoice.event_id) continue;
      const key = keyFor(invoice.event_id, invoice.currency_code);
      const entry = totals.get(key) ?? { revenue: 0, expenses: 0 };
      entry.revenue += li.quantity * li.unit_price;
      totals.set(key, entry);
    }

    for (const expense of expenses ?? []) {
      if (!expense.event_id) continue;
      const key = keyFor(expense.event_id, expense.currency_code);
      const entry = totals.get(key) ?? { revenue: 0, expenses: 0 };
      entry.expenses += expense.amount;
      totals.set(key, entry);
    }

    return [...totals.entries()]
      .map(([key, entry]) => {
        const [eventId, currencyCode] = key.split("::");
        return {
          eventId,
          eventName: eventNameById.get(eventId) ?? "—",
          currencyCode,
          revenue: entry.revenue,
          expenses: entry.expenses,
          profit: entry.revenue - entry.expenses,
        };
      })
      .sort((a, b) => b.profit - a.profit);
  },
};
