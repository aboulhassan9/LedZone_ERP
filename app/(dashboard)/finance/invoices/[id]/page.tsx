import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { InvoiceDetail } from "@/modules/finance/components/invoices/invoice-detail";
import type {
  InvoiceRow,
  InvoiceLineItemRow,
  InvoicePaymentRow,
} from "@/modules/finance/repositories/invoice-repository";

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("finance.view");
  const { id } = await params;

  const supabase = await createClient();
  const { data: invoice } = await supabase
    .from("invoices")
    .select(
      "id, invoice_number, customer_id, event_id, rental_agreement_id, status, currency_code, issue_date, due_date, notes, created_at, updated_at"
    )
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (!invoice) notFound();
  const invoiceRow = invoice as InvoiceRow;

  const [{ data: lineItems }, { data: payments }, { data: customer }, { data: event }] = await Promise.all([
    supabase.from("invoice_line_items").select("id, invoice_id, description, quantity, unit_price, notes").eq("invoice_id", id),
    supabase
      .from("invoice_payments")
      .select("id, invoice_id, amount, paid_at, method, reference, notes, created_at")
      .eq("invoice_id", id)
      .order("paid_at", { ascending: false }),
    supabase.from("customers").select("id, company_name, full_name").eq("id", invoiceRow.customer_id).maybeSingle(),
    invoiceRow.event_id
      ? supabase.from("events").select("id, name").eq("id", invoiceRow.event_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const customerName = customer?.company_name ?? customer?.full_name ?? "—";
  const eventName = event?.name ?? null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Invoice</h1>
        <p className="text-muted-foreground text-sm">Draft → Sent → Paid/Cancelled.</p>
      </div>
      <InvoiceDetail
        invoice={invoiceRow}
        lineItems={(lineItems ?? []) as InvoiceLineItemRow[]}
        payments={(payments ?? []) as InvoicePaymentRow[]}
        customerName={customerName}
        eventName={eventName}
      />
    </div>
  );
}
