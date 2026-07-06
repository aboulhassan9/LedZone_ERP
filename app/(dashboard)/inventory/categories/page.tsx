import { requirePermission, hasPermission } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { CategoryTable } from "@/modules/inventory/components/reference-data/category-table";
import { CategoryFormDialog } from "@/modules/inventory/components/reference-data/category-form-dialog";
import type { EquipmentCategoryRow } from "@/modules/inventory/repositories/equipment-category-repository";

export default async function EquipmentCategoriesPage() {
  await requirePermission("inventory.view");

  const supabase = await createClient();
  const [{ data: categories }, canManage] = await Promise.all([
    supabase
      .from("equipment_categories")
      .select("id, parent_id, name, description, icon, status")
      .is("deleted_at", null)
      .order("name"),
    hasPermission("inventory.manage"),
  ]);

  const rows = (categories ?? []) as EquipmentCategoryRow[];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Equipment Categories</h1>
          <p className="text-muted-foreground text-sm">
            Group equipment models for asset tag prefixes and specification schemas.
          </p>
        </div>
        {canManage && <CategoryFormDialog categories={rows} />}
      </div>
      <CategoryTable categories={rows} />
    </div>
  );
}
