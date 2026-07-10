import { requirePermission, hasPermission } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { VehicleTable } from "@/modules/planning/components/vehicles/vehicle-table";
import { VehicleFormDialog } from "@/modules/planning/components/vehicles/vehicle-form-dialog";
import type { VehicleRow } from "@/modules/planning/repositories/resource-assignment-repository";

export default async function VehiclesPage() {
  await requirePermission("planning.view");

  const supabase = await createClient();
  const [{ data: vehicles }, canManage] = await Promise.all([
    supabase
      .from("vehicles")
      .select("id, name, plate_number, vehicle_type, capacity_notes, is_active")
      .is("deleted_at", null)
      .order("name"),
    hasPermission("planning.manage").then((v) => v || hasPermission("planning.assign.vehicle")),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Vehicles</h1>
          <p className="text-muted-foreground text-sm">A minimal directory for booking vehicles against plans.</p>
        </div>
        {canManage && <VehicleFormDialog />}
      </div>
      <VehicleTable vehicles={(vehicles ?? []) as VehicleRow[]} />
    </div>
  );
}
