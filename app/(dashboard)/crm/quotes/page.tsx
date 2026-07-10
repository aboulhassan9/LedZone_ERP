import { requirePermission, hasPermission } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { QuoteTable } from "@/modules/crm/components/quotes/quote-table";
import { QuoteCreateDialog } from "@/modules/crm/components/quotes/quote-create-dialog";
import type { QuoteRow } from "@/modules/crm/repositories/quote-repository";

export default async function QuotesPage() {
  await requirePermission("crm.view");

  const supabase = await createClient();
  const [{ data: quotes }, { data: customers }, { data: currencies }, { data: models }, canManage] =
    await Promise.all([
      supabase
        .from("quotes")
        .select("id, quote_number, customer_id, status, valid_until, currency_code, event_reference, notes, created_at, updated_at")
        .is("deleted_at", null)
        .order("created_at", { ascending: false }),
      supabase
        .from("customers")
        .select("id, company_name, full_name")
        .is("deleted_at", null)
        .order("company_name"),
      supabase.from("currencies").select("code, name").eq("is_active", true).order("code"),
      supabase.from("equipment_models").select("id, model_name").is("deleted_at", null).eq("status", "active").order("model_name"),
      hasPermission("crm.manage").then((v) => v || hasPermission("crm.quotes.manage")),
    ]);

  const customerRows = customers ?? [];
  const customerNames = Object.fromEntries(
    customerRows.map((c) => [c.id, c.company_name ?? c.full_name ?? "—"])
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Quotes</h1>
          <p className="text-muted-foreground text-sm">Estimates feeding into future events and rentals.</p>
        </div>
        {canManage && (
          <QuoteCreateDialog
            customers={customerRows.map((c) => ({ id: c.id, label: c.company_name ?? c.full_name ?? "—" }))}
            currencies={(currencies ?? []).map((c) => ({ code: c.code, label: `${c.code} — ${c.name}` }))}
            models={(models ?? []).map((m) => ({ id: m.id, label: m.model_name }))}
          />
        )}
      </div>
      <QuoteTable quotes={(quotes ?? []) as QuoteRow[]} customerNames={customerNames} />
    </div>
  );
}
