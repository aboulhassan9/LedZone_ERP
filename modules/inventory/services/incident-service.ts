import "server-only";
import { assertAnyPermission } from "@/modules/inventory/shared/authorize";
import { logInventoryAudit } from "@/modules/inventory/shared/audit";
import { toInventoryError } from "@/modules/inventory/errors";
import {
  createDamageReportSchema,
  createLostReportSchema,
  type CreateDamageReportInput,
  type CreateLostReportInput,
} from "@/modules/inventory/schemas/incident-schema";
import {
  incidentRepository,
  type EquipmentDamageReportRow,
  type EquipmentLostReportRow,
} from "@/modules/inventory/repositories/incident-repository";

const INCIDENT_PERMISSIONS = ["inventory.maintenance.manage", "inventory.manage"];

async function createDamageReport(
  input: CreateDamageReportInput
): Promise<EquipmentDamageReportRow> {
  await assertAnyPermission(INCIDENT_PERMISSIONS);
  const parsed = createDamageReportSchema.parse(input);
  try {
    const report = await incidentRepository.createDamageReportViaTransaction(parsed);
    await logInventoryAudit("equipment_item.damage_reported", "equipment_items", parsed.itemId, {
      severity: parsed.severity,
    });
    return report;
  } catch (error) {
    throw toInventoryError(error, "Damage report");
  }
}

async function createLostReport(input: CreateLostReportInput): Promise<EquipmentLostReportRow> {
  await assertAnyPermission(INCIDENT_PERMISSIONS);
  const parsed = createLostReportSchema.parse(input);
  try {
    const report = await incidentRepository.createLostReportViaTransaction(parsed);
    await logInventoryAudit("equipment_item.lost_reported", "equipment_items", parsed.itemId, {
      lastKnownLocationId: parsed.lastKnownLocationId,
    });
    return report;
  } catch (error) {
    throw toInventoryError(error, "Lost report");
  }
}

export const incidentService = { createDamageReport, createLostReport };
