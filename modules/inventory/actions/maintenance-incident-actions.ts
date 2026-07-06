"use server";

import { revalidatePath } from "next/cache";
import { runAction } from "@/modules/inventory/shared/run-action";
import type { ActionResult } from "@/modules/inventory/types/action-result";
import { maintenanceService } from "@/modules/inventory/services/maintenance-service";
import { incidentService } from "@/modules/inventory/services/incident-service";
import type {
  CreateMaintenanceScheduleInput,
  CreateMaintenanceRecordInput,
} from "@/modules/inventory/schemas/maintenance-schema";
import type {
  CreateDamageReportInput,
  CreateLostReportInput,
} from "@/modules/inventory/schemas/incident-schema";
import type {
  EquipmentMaintenanceScheduleRow,
  EquipmentMaintenanceRecordRow,
} from "@/modules/inventory/repositories/maintenance-repository";
import type {
  EquipmentDamageReportRow,
  EquipmentLostReportRow,
} from "@/modules/inventory/repositories/incident-repository";

export async function createMaintenanceScheduleAction(
  input: CreateMaintenanceScheduleInput
): Promise<ActionResult<EquipmentMaintenanceScheduleRow>> {
  const result = await runAction(() => maintenanceService.createMaintenanceSchedule(input));
  revalidatePath(`/inventory/items/${input.itemId}`);
  return result;
}

export async function createMaintenanceRecordAction(
  input: CreateMaintenanceRecordInput
): Promise<ActionResult<EquipmentMaintenanceRecordRow>> {
  const result = await runAction(() => maintenanceService.createMaintenanceRecord(input));
  revalidatePath(`/inventory/items/${input.itemId}`);
  return result;
}

export async function createDamageReportAction(
  input: CreateDamageReportInput
): Promise<ActionResult<EquipmentDamageReportRow>> {
  const result = await runAction(() => incidentService.createDamageReport(input));
  revalidatePath(`/inventory/items/${input.itemId}`);
  return result;
}

export async function createLostReportAction(
  input: CreateLostReportInput
): Promise<ActionResult<EquipmentLostReportRow>> {
  const result = await runAction(() => incidentService.createLostReport(input));
  revalidatePath(`/inventory/items/${input.itemId}`);
  return result;
}
