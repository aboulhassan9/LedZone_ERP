import { requirePermission, hasPermission } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { StorageLocationTable } from "@/modules/inventory/components/reference-data/storage-location-table";
import { StorageLocationFormDialog } from "@/modules/inventory/components/reference-data/storage-location-form-dialog";
import type { StorageLocationRow } from "@/modules/inventory/repositories/storage-location-repository";

export default async function StorageLocationsPage() {
  await requirePermission("inventory.view");

  const supabase = await createClient();
  const [{ data: storageLocations }, { data: locations }, canManage] = await Promise.all([
    supabase
      .from("storage_locations")
      .select("id, location_id, name, code, status")
      .is("deleted_at", null)
      .order("name"),
    supabase.from("locations").select("id, name").is("deleted_at", null).order("name"),
    hasPermission("inventory.manage"),
  ]);

  const rows = (storageLocations ?? []) as StorageLocationRow[];
  const locationRows = locations ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Storage Locations</h1>
          <p className="text-muted-foreground text-sm">
            Bin/rack/shelf granularity within each site.
          </p>
        </div>
        {canManage && <StorageLocationFormDialog locations={locationRows} />}
      </div>
      <StorageLocationTable storageLocations={rows} locations={locationRows} />
    </div>
  );
}
