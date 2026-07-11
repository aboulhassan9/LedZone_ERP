import { requirePermission, hasPermission } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { CustomerTable } from "@/modules/crm/components/customers/customer-table";
import { CustomerFormDialog } from "@/modules/crm/components/customers/customer-form-dialog";
import type { CustomerRow } from "@/modules/crm/repositories/customer-repository";

export default async function CustomersPage() {
  await requirePermission("crm.view");

  const supabase = await createClient();
  const [{ data: customers }, canCreate] = await Promise.all([
    supabase
      .from("customers")
      .select(
        "id, customer_type, lifecycle_stage, company_name, full_name, email, phone, billing_address, tax_id, source, assigned_to, notes, created_at, updated_at"
      )
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
    hasPermission("crm.manage").then((v) => v || hasPermission("crm.create")),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Customers</h1>
          <p className="text-muted-foreground text-sm">Companies and individuals, from first inquiry to active client.</p>
        </div>
        {canCreate && <CustomerFormDialog />}
      </div>
      <CustomerTable customers={(customers ?? []) as CustomerRow[]} />
    </div>
  );
}
