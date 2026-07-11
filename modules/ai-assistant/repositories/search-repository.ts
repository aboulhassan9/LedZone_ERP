import "server-only";
import { createClient } from "@/lib/supabase/server";

export type SearchResult = {
  type: "equipment_item" | "customer" | "event" | "invoice" | "rental_agreement" | "quote";
  id: string;
  title: string;
  subtitle: string | null;
  href: string;
};

// Structured cross-module search -- no LLM involved. Each query targets the field a user would
// actually type (asset tag, serial number, model/company/event name, or a document number),
// not a full-text index, since none of these tables carry one yet.
export const searchRepository = {
  async search(query: string): Promise<SearchResult[]> {
    const trimmed = query.trim();
    if (trimmed.length < 2) return [];

    const supabase = await createClient();
    const like = `%${trimmed}%`;

    const [items, customers, events, invoices, agreements, quotes] = await Promise.all([
      supabase
        .from("equipment_items")
        .select("id, asset_tag, serial_number, current_status")
        .or(`asset_tag.ilike.${like},serial_number.ilike.${like}`)
        .is("deleted_at", null)
        .limit(10),
      supabase
        .from("customers")
        .select("id, company_name, full_name")
        .or(`company_name.ilike.${like},full_name.ilike.${like}`)
        .is("deleted_at", null)
        .limit(10),
      supabase.from("events").select("id, name, status").ilike("name", like).is("deleted_at", null).limit(10),
      supabase
        .from("invoices")
        .select("id, invoice_number, status")
        .ilike("invoice_number", like)
        .is("deleted_at", null)
        .limit(10),
      supabase
        .from("rental_agreements")
        .select("id, agreement_number, status")
        .ilike("agreement_number", like)
        .is("deleted_at", null)
        .limit(10),
      supabase
        .from("quotes")
        .select("id, quote_number, status")
        .ilike("quote_number", like)
        .is("deleted_at", null)
        .limit(10),
    ]);

    const results: SearchResult[] = [];

    for (const item of items.data ?? []) {
      results.push({
        type: "equipment_item",
        id: item.id,
        title: item.asset_tag,
        subtitle: `${item.current_status}${item.serial_number ? ` — S/N ${item.serial_number}` : ""}`,
        href: `/inventory/items/${item.id}`,
      });
    }
    for (const customer of customers.data ?? []) {
      results.push({
        type: "customer",
        id: customer.id,
        title: customer.company_name ?? customer.full_name ?? "—",
        subtitle: "Customer",
        href: `/crm/customers/${customer.id}`,
      });
    }
    for (const event of events.data ?? []) {
      results.push({ type: "event", id: event.id, title: event.name, subtitle: event.status, href: `/events/${event.id}` });
    }
    for (const invoice of invoices.data ?? []) {
      results.push({
        type: "invoice",
        id: invoice.id,
        title: invoice.invoice_number,
        subtitle: invoice.status,
        href: `/finance/invoices/${invoice.id}`,
      });
    }
    for (const agreement of agreements.data ?? []) {
      results.push({
        type: "rental_agreement",
        id: agreement.id,
        title: agreement.agreement_number,
        subtitle: agreement.status,
        href: `/rental/${agreement.id}`,
      });
    }
    for (const quote of quotes.data ?? []) {
      results.push({
        type: "quote",
        id: quote.id,
        title: quote.quote_number,
        subtitle: quote.status,
        href: `/crm/quotes/${quote.id}`,
      });
    }

    return results;
  },
};
