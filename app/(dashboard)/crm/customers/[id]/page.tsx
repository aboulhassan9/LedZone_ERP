import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { CustomerDetail } from "@/modules/crm/components/customers/customer-detail";
import type { CustomerRow, CustomerContactRow } from "@/modules/crm/repositories/customer-repository";
import type { QuoteRow } from "@/modules/crm/repositories/quote-repository";

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("crm.view");
  const { id } = await params;

  const supabase = await createClient();
  const { data: customer } = await supabase
    .from("customers")
    .select(
      "id, customer_type, lifecycle_stage, company_name, full_name, email, phone, billing_address, tax_id, source, assigned_to, notes, created_at, updated_at"
    )
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (!customer) notFound();

  const [{ data: contacts }, { data: quotes }] = await Promise.all([
    supabase
      .from("customer_contacts")
      .select("id, customer_id, full_name, role, email, phone, is_primary")
      .eq("customer_id", id)
      .order("is_primary", { ascending: false }),
    supabase
      .from("quotes")
      .select("id, quote_number, customer_id, status, valid_until, currency_code, event_id, notes, created_at, updated_at")
      .eq("customer_id", id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Customer</h1>
        <p className="text-muted-foreground text-sm">Contacts and quote history.</p>
      </div>
      <CustomerDetail
        customer={customer as CustomerRow}
        contacts={(contacts ?? []) as CustomerContactRow[]}
        quotes={(quotes ?? []) as QuoteRow[]}
      />
    </div>
  );
}
