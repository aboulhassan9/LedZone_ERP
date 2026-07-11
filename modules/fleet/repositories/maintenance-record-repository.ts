import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { CreateMaintenanceRecordInput } from "@/modules/fleet/schemas/maintenance-record-schema";

export type MaintenanceRecordRow = {
  id: string;
  vehicle_id: string;
  maintenance_type: string;
  description: string;
  cost: number | null;
  currency_code: string | null;
  odometer_km: number | null;
  service_date: string;
  next_service_date: string | null;
  performed_by: string | null;
  notes: string | null;
  created_at: string;
};

const RECORD_COLUMNS =
  "id, vehicle_id, maintenance_type, description, cost, currency_code, odometer_km, service_date, next_service_date, performed_by, notes, created_at";

export const maintenanceRecordRepository = {
  async findByVehicle(vehicleId: string): Promise<MaintenanceRecordRow[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("vehicle_maintenance_records")
      .select(RECORD_COLUMNS)
      .eq("vehicle_id", vehicleId)
      .order("service_date", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async create(
    vehicleId: string,
    input: CreateMaintenanceRecordInput,
    userId: string
  ): Promise<MaintenanceRecordRow> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("vehicle_maintenance_records")
      .insert({
        vehicle_id: vehicleId,
        maintenance_type: input.maintenanceType,
        description: input.description,
        cost: input.cost ?? null,
        currency_code: input.currencyCode ?? null,
        odometer_km: input.odometerKm ?? null,
        service_date: input.serviceDate,
        next_service_date: input.nextServiceDate ?? null,
        performed_by: input.performedBy ?? null,
        notes: input.notes ?? null,
        created_by: userId,
        updated_by: userId,
      })
      .select(RECORD_COLUMNS)
      .single();
    if (error) throw error;
    return data;
  },
};
