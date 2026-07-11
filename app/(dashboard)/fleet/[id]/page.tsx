import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { VehicleDetail } from "@/modules/fleet/components/vehicles/vehicle-detail";
import type { VehicleRow } from "@/modules/fleet/repositories/vehicle-repository";
import type { MaintenanceRecordRow } from "@/modules/fleet/repositories/maintenance-record-repository";
import type { FuelLogRow } from "@/modules/fleet/repositories/fuel-log-repository";

export default async function VehicleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("fleet.view");
  const { id } = await params;

  const supabase = await createClient();
  const { data: vehicle } = await supabase
    .from("vehicles")
    .select(
      "id, name, plate_number, vehicle_type, capacity_notes, is_active, make, model, year, vin, fuel_type, odometer_km, fleet_status, insurance_expiry_date, registration_expiry_date, created_at, updated_at"
    )
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (!vehicle) notFound();

  const [{ data: maintenanceRecords }, { data: fuelLogs }, { data: currencies }] = await Promise.all([
    supabase
      .from("vehicle_maintenance_records")
      .select("id, vehicle_id, maintenance_type, description, cost, currency_code, odometer_km, service_date, next_service_date, performed_by, notes, created_at")
      .eq("vehicle_id", id)
      .order("service_date", { ascending: false }),
    supabase
      .from("vehicle_fuel_logs")
      .select("id, vehicle_id, fuel_date, liters, cost, currency_code, odometer_km, notes, created_at")
      .eq("vehicle_id", id)
      .order("fuel_date", { ascending: false }),
    supabase.from("currencies").select("code, name").eq("is_active", true).order("code"),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Vehicle</h1>
        <p className="text-muted-foreground text-sm">Fleet condition, maintenance history, and fuel logs.</p>
      </div>
      <VehicleDetail
        vehicle={vehicle as VehicleRow}
        maintenanceRecords={(maintenanceRecords ?? []) as MaintenanceRecordRow[]}
        fuelLogs={(fuelLogs ?? []) as FuelLogRow[]}
        currencies={(currencies ?? []).map((c) => ({ code: c.code, label: `${c.code} — ${c.name}` }))}
      />
    </div>
  );
}
