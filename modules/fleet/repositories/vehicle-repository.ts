import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { UpdateVehicleFleetInfoInput } from "@/modules/fleet/schemas/vehicle-schema";

// Reads/writes the shared `vehicles` table Planning's 0050 migration created (and this
// module's 0071 migration extended). Fleet only ever touches its own additive columns; it
// never writes name/plate_number/vehicle_type/capacity_notes/is_active -- those stay
// Planning's field via its own existing repository.
export type VehicleRow = {
  id: string;
  name: string;
  plate_number: string | null;
  vehicle_type: string | null;
  capacity_notes: string | null;
  is_active: boolean;
  make: string | null;
  model: string | null;
  year: number | null;
  vin: string | null;
  fuel_type: string | null;
  odometer_km: number | null;
  fleet_status: string;
  insurance_expiry_date: string | null;
  registration_expiry_date: string | null;
  created_at: string;
  updated_at: string;
};

const VEHICLE_COLUMNS =
  "id, name, plate_number, vehicle_type, capacity_notes, is_active, make, model, year, vin, fuel_type, odometer_km, fleet_status, insurance_expiry_date, registration_expiry_date, created_at, updated_at";

export const vehicleRepository = {
  async findById(id: string): Promise<VehicleRow | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("vehicles")
      .select(VEHICLE_COLUMNS)
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async list(): Promise<VehicleRow[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("vehicles")
      .select(VEHICLE_COLUMNS)
      .is("deleted_at", null)
      .order("name");
    if (error) throw error;
    return data ?? [];
  },

  async updateFleetInfo(
    id: string,
    input: UpdateVehicleFleetInfoInput,
    userId: string
  ): Promise<VehicleRow> {
    const supabase = await createClient();
    const patch: Record<string, unknown> = { updated_by: userId };
    if (input.make !== undefined) patch.make = input.make;
    if (input.model !== undefined) patch.model = input.model;
    if (input.year !== undefined) patch.year = input.year;
    if (input.vin !== undefined) patch.vin = input.vin;
    if (input.fuelType !== undefined) patch.fuel_type = input.fuelType;
    if (input.odometerKm !== undefined) patch.odometer_km = input.odometerKm;
    if (input.fleetStatus !== undefined) patch.fleet_status = input.fleetStatus;
    if (input.insuranceExpiryDate !== undefined) patch.insurance_expiry_date = input.insuranceExpiryDate;
    if (input.registrationExpiryDate !== undefined) patch.registration_expiry_date = input.registrationExpiryDate;

    const { data, error } = await supabase
      .from("vehicles")
      .update(patch)
      .eq("id", id)
      .select(VEHICLE_COLUMNS)
      .single();
    if (error) throw error;
    return data;
  },
};
