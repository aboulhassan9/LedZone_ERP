import { requirePermission, hasPermission } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { PurchaseTable } from "@/modules/inventory/components/purchases/purchase-table";
import { PurchaseFormDialog } from "@/modules/inventory/components/purchases/purchase-form-dialog";
import type { EquipmentPurchaseRow } from "@/modules/inventory/repositories/purchase-repository";
import type { SupplierRow } from "@/modules/inventory/repositories/supplier-repository";

export default async function PurchasesPage() {
  await requirePermission("inventory.view");

  const supabase = await createClient();
  const [{ data: purchases }, { data: suppliers }, { data: currencies }, canManage] = await Promise.all([
    supabase
      .from("equipment_purchases")
      .select(
        "id, supplier_id, purchase_date, invoice_number, currency_code, exchange_rate_id, subtotal_amount, tax_amount, total_amount, status, notes"
      )
      .is("deleted_at", null)
      .order("purchase_date", { ascending: false }),
    supabase
      .from("suppliers")
      .select("id, name, contact_name, email, phone, address, country, preferred_currency, status")
      .is("deleted_at", null)
      .order("name"),
    supabase.from("currencies").select("code, name").eq("is_active", true).order("code"),
    hasPermission("inventory.manage"),
  ]);

  const purchaseRows = (purchases ?? []) as EquipmentPurchaseRow[];
  const supplierRows = (suppliers ?? []) as SupplierRow[];
  const currencyRows = currencies ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Purchase Records</h1>
          <p className="text-muted-foreground text-sm">
            Equipment purchases from suppliers, linked to the items they bring in.
          </p>
        </div>
        {canManage && <PurchaseFormDialog suppliers={supplierRows} currencies={currencyRows} />}
      </div>
      <PurchaseTable purchases={purchaseRows} suppliers={supplierRows} currencies={currencyRows} />
    </div>
  );
}
