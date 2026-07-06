import "server-only";
import { assertAnyPermission } from "@/modules/inventory/shared/authorize";
import { logInventoryAudit } from "@/modules/inventory/shared/audit";
import { toInventoryError } from "@/modules/inventory/errors";
import {
  createMaintenanceScheduleSchema,
  createMaintenanceRecordSchema,
  type CreateMaintenanceScheduleInput,
  type CreateMaintenanceRecordInput,
} from "@/modules/inventory/schemas/maintenance-schema";
import {
  maintenanceRepository,
  type EquipmentMaintenanceScheduleRow,
  type EquipmentMaintenanceRecordRow,
} from "@/modules/inventory/repositories/maintenance-repository";

const MAINTENANCE_PERMISSIONS = ["inventory.maintenance.manage", "inventory.manage"];

async function createMaintenanceSchedule(
  input: CreateMaintenanceScheduleInput
): Promise<EquipmentMaintenanceScheduleRow> {
  const userId = await assertAnyPermission(MAINTENANCE_PERMISSIONS);
  const parsed = createMaintenanceScheduleSchema.parse(input);
  try {
    const schedule = await maintenanceRepository.createSchedule(parsed, userId);
    await logInventoryAudit(
      "equipment_item.maintenance_schedule_created",
      "equipment_items",
      parsed.itemId,
      { maintenanceType: parsed.maintenanceType, intervalDays: parsed.intervalDays }
    );
    return schedule;
  } catch (error) {
    throw toInventoryError(error, "Maintenance schedule");
  }
}

async function createMaintenanceRecord(
  input: CreateMaintenanceRecordInput
): Promise<EquipmentMaintenanceRecordRow> {
  await assertAnyPermission(MAINTENANCE_PERMISSIONS);
  const parsed = createMaintenanceRecordSchema.parse(input);
  try {
    const record = await maintenanceRepository.createRecordViaTransaction(parsed);
    await logInventoryAudit(
      "equipment_item.maintenance_recorded",
      "equipment_items",
      parsed.itemId,
      { maintenanceType: parsed.maintenanceType, markItemAvailable: parsed.markItemAvailable }
    );
    return record;
  } catch (error) {
    throw toInventoryError(error, "Maintenance record");
  }
}

export const maintenanceService = { createMaintenanceSchedule, createMaintenanceRecord };
