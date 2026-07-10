import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { QuoteDetail } from "@/modules/crm/components/quotes/quote-detail";
import type { QuoteRow, QuoteLineItemRow } from "@/modules/crm/repositories/quote-repository";

export default async function QuoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("crm.view");
  const { id } = await params;

  const supabase = await createClient();
  const { data: quote } = await supabase
    .from("quotes")
    .select("id, quote_number, customer_id, status, valid_until, currency_code, event_reference, notes, created_at, updated_at")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (!quote) notFound();
  const quoteRow = quote as QuoteRow;

  const [{ data: lineItems }, { data: customer }] = await Promise.all([
    supabase.from("quote_line_items").select("id, quote_id, model_id, quantity, unit_price, notes").eq("quote_id", id),
    supabase.from("customers").select("id, company_name, full_name").eq("id", quoteRow.customer_id).maybeSingle(),
  ]);

  const lineItemRows = (lineItems ?? []) as QuoteLineItemRow[];
  const modelIds = [...new Set(lineItemRows.map((li) => li.model_id))];
  const { data: models } = modelIds.length
    ? await supabase.from("equipment_models").select("id, model_name").in("id", modelIds)
    : { data: [] };

  const modelNames = Object.fromEntries((models ?? []).map((m) => [m.id, m.model_name]));
  const customerName = customer?.company_name ?? customer?.full_name ?? "—";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Quote</h1>
        <p className="text-muted-foreground text-sm">Draft → Sent → Accepted/Rejected/Expired.</p>
      </div>
      <QuoteDetail quote={quoteRow} lineItems={lineItemRows} customerName={customerName} modelNames={modelNames} />
    </div>
  );
}
