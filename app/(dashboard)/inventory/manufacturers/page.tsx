import { requirePermission, hasPermission } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { ManufacturerTable } from "@/modules/inventory/components/reference-data/manufacturer-table";
import { ManufacturerFormDialog } from "@/modules/inventory/components/reference-data/manufacturer-form-dialog";
import type { ManufacturerRow } from "@/modules/inventory/repositories/manufacturer-repository";

export default async function ManufacturersPage() {
  await requirePermission("inventory.view");

  const supabase = await createClient();
  const [{ data: manufacturers }, canManage] = await Promise.all([
    supabase
      .from("manufacturers")
      .select("id, name, country, website, support_email, support_phone, status")
      .is("deleted_at", null)
      .order("name"),
    hasPermission("inventory.manage"),
  ]);

  const rows = (manufacturers ?? []) as ManufacturerRow[];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Manufacturers</h1>
          <p className="text-muted-foreground text-sm">
            The manufacturers behind LED Zone&apos;s equipment models.
          </p>
        </div>
        {canManage && <ManufacturerFormDialog />}
      </div>
      <ManufacturerTable manufacturers={rows} />
    </div>
  );
}
