import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { CreateMaintenanceScheduleInput } from "@/modules/inventory/schemas/maintenance-schema";

export type EquipmentMaintenanceScheduleRow = {
  id: string;
  item_id: string;
  maintenance_type: string;
  interval_days: number;
  last_performed_date: string | null;
  next_due_date: string | null;
  is_active: boolean;
};

export type EquipmentMaintenanceRecordRow = {
  id: string;
  item_id: string;
  schedule_id: string | null;
  damage_report_id: string | null;
  performed_date: string;
  maintenance_type: string;
  description: string | null;
  cost: number | null;
  currency_code: string | null;
};

const SCHEDULE_COLUMNS =
  "id, item_id, maintenance_type, interval_days, last_performed_date, next_due_date, is_active";

export const maintenanceRepository = {
  async findScheduleById(id: string): Promise<EquipmentMaintenanceScheduleRow | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("equipment_maintenance_schedules")
      .select(SCHEDULE_COLUMNS)
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async createSchedule(
    input: CreateMaintenanceScheduleInput,
    userId: string
  ): Promise<EquipmentMaintenanceScheduleRow> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("equipment_maintenance_schedules")
      .insert({
        item_id: input.itemId,
        maintenance_type: input.maintenanceType,
        interval_days: input.intervalDays,
        last_performed_date: input.lastPerformedDate,
        next_due_date: input.nextDueDate,
        created_by: userId,
        updated_by: userId,
      })
      .select(SCHEDULE_COLUMNS)
      .single();
    if (error) throw error;
    return data;
  },

  // Transactional: inserts the record, rolls the linked schedule's due date forward, and
  // optionally returns the item to available — all in one Postgres function.
  async createRecordViaTransaction(
    input: {
      itemId: string;
      maintenanceType: string;
      scheduleId?: string;
      damageReportId?: string;
      description?: string;
      cost?: number;
      currencyCode?: string;
      technicianName?: string;
      nextRecommendedDate?: string;
      markItemAvailable: boolean;
    }
  ): Promise<EquipmentMaintenanceRecordRow> {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("create_maintenance_record", {
      p_item_id: input.itemId,
      p_maintenance_type: input.maintenanceType,
      p_schedule_id: input.scheduleId ?? null,
      p_damage_report_id: input.damageReportId ?? null,
      p_description: input.description ?? null,
      p_cost: input.cost ?? null,
      p_currency_code: input.currencyCode ?? null,
      p_technician_name: input.technicianName ?? null,
      p_next_recommended_date: input.nextRecommendedDate ?? null,
      p_mark_item_available: input.markItemAvailable,
    });
    if (error) throw error;
    return data;
  },
};
