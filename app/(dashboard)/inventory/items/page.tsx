import { requirePermission, hasPermission } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { EquipmentItemTable } from "@/modules/inventory/components/items/equipment-item-table";
import { EquipmentItemCreateDialog } from "@/modules/inventory/components/items/equipment-item-create-dialog";
import type { EquipmentItemRow } from "@/modules/inventory/repositories/equipment-item-repository";
import type { EquipmentModelRow } from "@/modules/inventory/repositories/equipment-model-repository";

const MODEL_COLUMNS =
  "id, category_id, manufacturer_id, brand_id, model_name, model_number, description, tracking_type, specifications, default_warranty_months, expected_lifespan_months, image_url, status";

export default async function EquipmentItemsPage() {
  await requirePermission("inventory.view");

  const supabase = await createClient();
  const [{ data: items }, { data: models }, { data: storageLocations }, { data: purchases }, canManage] =
    await Promise.all([
      supabase
        .from("equipment_items")
        .select(
          "id, model_id, asset_tag, serial_number, purchase_id, current_status, current_condition, current_storage_location_id, notes"
        )
        .is("deleted_at", null)
        .order("asset_tag"),
      supabase
        .from("equipment_models")
        .select(MODEL_COLUMNS)
        .eq("tracking_type", "individual")
        .is("deleted_at", null)
        .order("model_name"),
      supabase.from("storage_locations").select("id, name").is("deleted_at", null).order("name"),
      supabase
        .from("equipment_purchases")
        .select("id, invoice_number, purchase_date")
        .is("deleted_at", null)
        .order("purchase_date", { ascending: false }),
      hasPermission("inventory.manage"),
    ]);

  const itemRows = (items ?? []) as EquipmentItemRow[];
  const modelRows = (models ?? []) as EquipmentModelRow[];
  const locationRows = storageLocations ?? [];
  const purchaseRows = purchases ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Equipment Items</h1>
          <p className="text-muted-foreground text-sm">
            Every individually tracked physical unit at LED Zone.
          </p>
        </div>
        {canManage && (
          <EquipmentItemCreateDialog
            models={modelRows}
            storageLocations={locationRows}
            purchases={purchaseRows}
          />
        )}
      </div>
      <EquipmentItemTable items={itemRows} models={modelRows} storageLocations={locationRows} />
    </div>
  );
}
