import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { CreateFuelLogInput } from "@/modules/fleet/schemas/fuel-log-schema";

export type FuelLogRow = {
  id: string;
  vehicle_id: string;
  fuel_date: string;
  liters: number;
  cost: number;
  currency_code: string;
  odometer_km: number | null;
  notes: string | null;
  created_at: string;
};

const LOG_COLUMNS = "id, vehicle_id, fuel_date, liters, cost, currency_code, odometer_km, notes, created_at";

export const fuelLogRepository = {
  async findByVehicle(vehicleId: string): Promise<FuelLogRow[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("vehicle_fuel_logs")
      .select(LOG_COLUMNS)
      .eq("vehicle_id", vehicleId)
      .order("fuel_date", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async create(vehicleId: string, input: CreateFuelLogInput, userId: string): Promise<FuelLogRow> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("vehicle_fuel_logs")
      .insert({
        vehicle_id: vehicleId,
        fuel_date: input.fuelDate,
        liters: input.liters,
        cost: input.cost,
        currency_code: input.currencyCode,
        odometer_km: input.odometerKm ?? null,
        notes: input.notes ?? null,
        created_by: userId,
      })
      .select(LOG_COLUMNS)
      .single();
    if (error) throw error;
    return data;
  },
};
