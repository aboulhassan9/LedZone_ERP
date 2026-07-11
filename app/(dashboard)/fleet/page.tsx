import { requirePermission } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { FleetVehicleTable } from "@/modules/fleet/components/vehicles/vehicle-table";
import type { VehicleRow } from "@/modules/fleet/repositories/vehicle-repository";

export default async function FleetPage() {
  await requirePermission("fleet.view");

  const supabase = await createClient();
  const { data: vehicles } = await supabase
    .from("vehicles")
    .select(
      "id, name, plate_number, vehicle_type, capacity_notes, is_active, make, model, year, vin, fuel_type, odometer_km, fleet_status, insurance_expiry_date, registration_expiry_date, created_at, updated_at"
    )
    .is("deleted_at", null)
    .order("name");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Fleet</h1>
        <p className="text-muted-foreground text-sm">
          Vehicle condition, maintenance, and fuel logs. The directory entry itself (name/plate) is
          managed from Planning &rsaquo; Vehicles.
        </p>
      </div>
      <FleetVehicleTable vehicles={(vehicles ?? []) as VehicleRow[]} />
    </div>
  );
}
