import { requirePermission, hasPermission } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { InvoiceTable } from "@/modules/finance/components/invoices/invoice-table";
import { InvoiceCreateDialog } from "@/modules/finance/components/invoices/invoice-create-dialog";
import type { InvoiceRow } from "@/modules/finance/repositories/invoice-repository";

export default async function InvoicesPage() {
  await requirePermission("finance.view");

  const supabase = await createClient();
  const [{ data: invoices }, { data: customers }, { data: currencies }, { data: events }, { data: agreements }, canCreate] =
    await Promise.all([
      supabase
        .from("invoices")
        .select(
          "id, invoice_number, customer_id, event_id, rental_agreement_id, status, currency_code, issue_date, due_date, notes, created_at, updated_at"
        )
        .is("deleted_at", null)
        .order("created_at", { ascending: false }),
      supabase.from("customers").select("id, company_name, full_name").is("deleted_at", null).order("company_name"),
      supabase.from("currencies").select("code, name").eq("is_active", true).order("code"),
      supabase.from("events").select("id, name").is("deleted_at", null).order("event_start_at", { ascending: false }),
      supabase.from("rental_agreements").select("id, agreement_number").is("deleted_at", null).order("created_at", { ascending: false }),
      hasPermission("finance.manage").then((v) => v || hasPermission("finance.invoices.manage")),
    ]);

  const customerRows = customers ?? [];
  const customerNames = Object.fromEntries(
    customerRows.map((c) => [c.id, c.company_name ?? c.full_name ?? "—"])
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Invoices</h1>
          <p className="text-muted-foreground text-sm">Bills sent to customers, with payments tracked against each one.</p>
        </div>
        {canCreate && (
          <InvoiceCreateDialog
            customers={customerRows.map((c) => ({ id: c.id, label: c.company_name ?? c.full_name ?? "—" }))}
            currencies={(currencies ?? []).map((c) => ({ code: c.code, label: `${c.code} — ${c.name}` }))}
            events={(events ?? []).map((e) => ({ id: e.id, label: e.name }))}
            rentalAgreements={(agreements ?? []).map((a) => ({ id: a.id, label: a.agreement_number }))}
          />
        )}
      </div>
      <InvoiceTable invoices={(invoices ?? []) as InvoiceRow[]} customerNames={customerNames} />
    </div>
  );
}
