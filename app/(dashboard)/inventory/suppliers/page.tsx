import { requirePermission, hasPermission } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { SupplierTable } from "@/modules/inventory/components/reference-data/supplier-table";
import { SupplierFormDialog } from "@/modules/inventory/components/reference-data/supplier-form-dialog";
import type { SupplierRow } from "@/modules/inventory/repositories/supplier-repository";

export default async function SuppliersPage() {
  await requirePermission("inventory.view");

  const supabase = await createClient();
  const [{ data: suppliers }, { data: currencies }, canManage] = await Promise.all([
    supabase
      .from("suppliers")
      .select("id, name, contact_name, email, phone, address, country, preferred_currency, status")
      .is("deleted_at", null)
      .order("name"),
    supabase.from("currencies").select("code, name").eq("is_active", true).order("code"),
    hasPermission("inventory.manage"),
  ]);

  const rows = (suppliers ?? []) as SupplierRow[];
  const currencyRows = currencies ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Suppliers</h1>
          <p className="text-muted-foreground text-sm">Vendors LED Zone purchases equipment from.</p>
        </div>
        {canManage && <SupplierFormDialog currencies={currencyRows} />}
      </div>
      <SupplierTable suppliers={rows} currencies={currencyRows} />
    </div>
  );
}
