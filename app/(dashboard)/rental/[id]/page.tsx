import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { AgreementDetail } from "@/modules/rental/components/agreements/agreement-detail";
import type {
  RentalAgreementRow,
  RentalAgreementLineItemRow,
} from "@/modules/rental/repositories/rental-agreement-repository";

export default async function RentalAgreementDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("rental.view");
  const { id } = await params;

  const supabase = await createClient();
  const { data: agreement } = await supabase
    .from("rental_agreements")
    .select(
      "id, agreement_number, customer_id, event_id, quote_id, status, currency_code, rental_start_at, rental_end_at, deposit_amount, deposit_status, notes, created_at, updated_at"
    )
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (!agreement) notFound();
  const agreementRow = agreement as RentalAgreementRow;

  const [{ data: lineItems }, { data: customer }, { data: event }] = await Promise.all([
    supabase
      .from("rental_agreement_line_items")
      .select("id, agreement_id, model_id, quantity, daily_rate, notes")
      .eq("agreement_id", id),
    supabase.from("customers").select("id, company_name, full_name").eq("id", agreementRow.customer_id).maybeSingle(),
    agreementRow.event_id
      ? supabase.from("events").select("id, name").eq("id", agreementRow.event_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const lineItemRows = (lineItems ?? []) as RentalAgreementLineItemRow[];
  const modelIds = [...new Set(lineItemRows.map((li) => li.model_id))];
  const { data: models } = modelIds.length
    ? await supabase.from("equipment_models").select("id, model_name").in("id", modelIds)
    : { data: [] };

  const modelNames = Object.fromEntries((models ?? []).map((m) => [m.id, m.model_name]));
  const customerName = customer?.company_name ?? customer?.full_name ?? "—";
  const eventName = event?.name ?? null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Rental agreement</h1>
        <p className="text-muted-foreground text-sm">Draft → Active → Completed/Cancelled.</p>
      </div>
      <AgreementDetail
        agreement={agreementRow}
        lineItems={lineItemRows}
        customerName={customerName}
        eventName={eventName}
        modelNames={modelNames}
      />
    </div>
  );
}
