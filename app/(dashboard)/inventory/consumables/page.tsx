import { requirePermission, hasPermission } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { ConsumableFormDialog } from "@/modules/inventory/components/consumables/consumable-form-dialog";
import { ConsumableStockMovementDialog } from "@/modules/inventory/components/consumables/consumable-stock-movement-dialog";
import {
  ConsumableStockTable,
  type ConsumableStockLevelRow,
} from "@/modules/inventory/components/consumables/consumable-stock-table";
import type { EquipmentModelRow } from "@/modules/inventory/repositories/equipment-model-repository";
import type { EquipmentCategoryRow } from "@/modules/inventory/repositories/equipment-category-repository";
import type { ManufacturerRow } from "@/modules/inventory/repositories/manufacturer-repository";

const MODEL_COLUMNS =
  "id, category_id, manufacturer_id, brand_id, model_name, model_number, description, tracking_type, specifications, default_warranty_months, expected_lifespan_months, image_url, status";

export default async function ConsumablesPage() {
  await requirePermission("inventory.view");

  const supabase = await createClient();
  const [
    { data: models },
    { data: stockLevels },
    { data: storageLocations },
    { data: categories },
    { data: manufacturers },
    canManage,
  ] = await Promise.all([
    supabase
      .from("equipment_models")
      .select(MODEL_COLUMNS)
      .eq("tracking_type", "consumable")
      .is("deleted_at", null)
      .order("model_name"),
    supabase
      .from("consumable_stock_levels")
      .select("id, model_id, storage_location_id, quantity_on_hand, unit_of_measure, reorder_threshold"),
    supabase.from("storage_locations").select("id, name").is("deleted_at", null).order("name"),
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
    hasPermission("inventory.manage"),
  ]);

  const modelRows = (models ?? []) as EquipmentModelRow[];
  const stockRows = (stockLevels ?? []) as ConsumableStockLevelRow[];
  const locationRows = storageLocations ?? [];
  const categoryRows = (categories ?? []) as EquipmentCategoryRow[];
  const manufacturerRows = (manufacturers ?? []) as ManufacturerRow[];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Consumables</h1>
          <p className="text-muted-foreground text-sm">
            Quantity-tracked supplies — tape, batteries, zip ties, screws.
          </p>
        </div>
        {canManage && (
          <div className="flex gap-2">
            <ConsumableStockMovementDialog models={modelRows} storageLocations={locationRows} />
            <ConsumableFormDialog categories={categoryRows} manufacturers={manufacturerRows} />
          </div>
        )}
      </div>
      <ConsumableStockTable stockLevels={stockRows} models={modelRows} storageLocations={locationRows} />
    </div>
  );
}
