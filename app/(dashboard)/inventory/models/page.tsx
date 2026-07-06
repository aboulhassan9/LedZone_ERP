import { requirePermission, hasPermission } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { EquipmentModelTable } from "@/modules/inventory/components/models/equipment-model-table";
import { EquipmentModelFormDialog } from "@/modules/inventory/components/models/equipment-model-form-dialog";
import type { EquipmentModelRow } from "@/modules/inventory/repositories/equipment-model-repository";
import type { EquipmentCategoryRow } from "@/modules/inventory/repositories/equipment-category-repository";
import type { ManufacturerRow } from "@/modules/inventory/repositories/manufacturer-repository";
import type { BrandRow } from "@/modules/inventory/repositories/brand-repository";

const MODEL_COLUMNS =
  "id, category_id, manufacturer_id, brand_id, model_name, model_number, description, tracking_type, specifications, default_warranty_months, expected_lifespan_months, image_url, status";

export default async function EquipmentModelsPage() {
  await requirePermission("inventory.view");

  const supabase = await createClient();
  const [{ data: models }, { data: categories }, { data: manufacturers }, { data: brands }, canManage] =
    await Promise.all([
      supabase
        .from("equipment_models")
        .select(MODEL_COLUMNS)
        .eq("tracking_type", "individual")
        .is("deleted_at", null)
        .order("model_name"),
      supabase
        .from("equipment_categories")
        .select("id, parent_id, name, description, icon, status")
        .is("deleted_at", null)
        .order("name"),
      supabase
        .from("manufacturers")
        .select("id, name, country, website, support_email, support_phone, status")
        .is("deleted_at", null)
        .order("name"),
      supabase
        .from("brands")
        .select("id, manufacturer_id, name, website, status")
        .is("deleted_at", null)
        .order("name"),
      hasPermission("inventory.manage"),
    ]);

  const modelRows = (models ?? []) as EquipmentModelRow[];
  const categoryRows = (categories ?? []) as EquipmentCategoryRow[];
  const manufacturerRows = (manufacturers ?? []) as ManufacturerRow[];
  const brandRows = (brands ?? []) as BrandRow[];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Equipment Models</h1>
          <p className="text-muted-foreground text-sm">
            The catalog of individually-tracked equipment models.
          </p>
        </div>
        {canManage && (
          <EquipmentModelFormDialog
            categories={categoryRows}
            manufacturers={manufacturerRows}
            brands={brandRows}
          />
        )}
      </div>
      <EquipmentModelTable
        models={modelRows}
        categories={categoryRows}
        manufacturers={manufacturerRows}
        brands={brandRows}
      />
    </div>
  );
}
