import { requirePermission, hasPermission } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { AgreementTable } from "@/modules/rental/components/agreements/agreement-table";
import { AgreementCreateDialog } from "@/modules/rental/components/agreements/agreement-create-dialog";
import type { RentalAgreementRow } from "@/modules/rental/repositories/rental-agreement-repository";

export default async function RentalPage() {
  await requirePermission("rental.view");

  const supabase = await createClient();
  const [{ data: agreements }, { data: customers }, { data: currencies }, { data: models }, { data: events }, canCreate] =
    await Promise.all([
      supabase
        .from("rental_agreements")
        .select(
          "id, agreement_number, customer_id, event_id, quote_id, status, currency_code, rental_start_at, rental_end_at, deposit_amount, deposit_status, notes, created_at, updated_at"
        )
        .is("deleted_at", null)
        .order("created_at", { ascending: false }),
      supabase.from("customers").select("id, company_name, full_name").is("deleted_at", null).order("company_name"),
      supabase.from("currencies").select("code, name").eq("is_active", true).order("code"),
      supabase.from("equipment_models").select("id, model_name").is("deleted_at", null).eq("status", "active").order("model_name"),
      supabase.from("events").select("id, name").is("deleted_at", null).order("event_start_at", { ascending: false }),
      hasPermission("rental.manage").then((v) => v || hasPermission("rental.create")),
    ]);

  const customerRows = customers ?? [];
  const customerNames = Object.fromEntries(
    customerRows.map((c) => [c.id, c.company_name ?? c.full_name ?? "—"])
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Rental agreements</h1>
          <p className="text-muted-foreground text-sm">Pricing, deposit, and contract status — checkout/check-in lives in Planning + Warehouse.</p>
        </div>
        {canCreate && (
          <AgreementCreateDialog
            customers={customerRows.map((c) => ({ id: c.id, label: c.company_name ?? c.full_name ?? "—" }))}
            currencies={(currencies ?? []).map((c) => ({ code: c.code, label: `${c.code} — ${c.name}` }))}
            models={(models ?? []).map((m) => ({ id: m.id, label: m.model_name }))}
            events={(events ?? []).map((e) => ({ id: e.id, label: e.name }))}
          />
        )}
      </div>
      <AgreementTable agreements={(agreements ?? []) as RentalAgreementRow[]} customerNames={customerNames} />
    </div>
  );
}
