import { requirePermission, hasPermission } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { BrandTable } from "@/modules/inventory/components/reference-data/brand-table";
import { BrandFormDialog } from "@/modules/inventory/components/reference-data/brand-form-dialog";
import type { BrandRow } from "@/modules/inventory/repositories/brand-repository";
import type { ManufacturerRow } from "@/modules/inventory/repositories/manufacturer-repository";

export default async function BrandsPage() {
  await requirePermission("inventory.view");

  const supabase = await createClient();
  const [{ data: brands }, { data: manufacturers }, canManage] = await Promise.all([
    supabase
      .from("brands")
      .select("id, manufacturer_id, name, website, status")
      .is("deleted_at", null)
      .order("name"),
    supabase
      .from("manufacturers")
      .select("id, name, country, website, support_email, support_phone, status")
      .is("deleted_at", null)
      .order("name"),
    hasPermission("inventory.manage"),
  ]);

  const brandRows = (brands ?? []) as BrandRow[];
  const manufacturerRows = (manufacturers ?? []) as ManufacturerRow[];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Brands</h1>
          <p className="text-muted-foreground text-sm">Sub-labels under a manufacturer.</p>
        </div>
        {canManage && <BrandFormDialog manufacturers={manufacturerRows} />}
      </div>
      <BrandTable brands={brandRows} manufacturers={manufacturerRows} />
    </div>
  );
}
