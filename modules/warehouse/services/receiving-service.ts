import "server-only";
import { assertAnyPermission } from "@/modules/warehouse/shared/authorize";
import { logWarehouseAudit } from "@/modules/warehouse/shared/audit";
import { ConflictError, NotFoundError, ValidationError, toWarehouseError } from "@/modules/warehouse/errors";
import {
  createReceivingSchema,
  type CreateReceivingInput,
} from "@/modules/warehouse/schemas/warehouse-receiving-schema";
import {
  warehouseReceivingRepository,
  type WarehouseReceivingRow,
  type WarehouseReceivingLineRow,
} from "@/modules/warehouse/repositories/warehouse-receiving-repository";
import { incidentService } from "@/modules/inventory/services/incident-service";

async function requireLine(lineId: string): Promise<WarehouseReceivingLineRow> {
  const line = await warehouseReceivingRepository.findLineById(lineId);
  if (!line) throw new NotFoundError("Receiving line");
  return line;
}

async function createReceiving(input: CreateReceivingInput): Promise<{
  record: WarehouseReceivingRow;
  lines: WarehouseReceivingLineRow[];
}> {
  const userId = await assertAnyPermission(["warehouse.manage", "warehouse.receive"]);
  const parsed = createReceivingSchema.parse(input);

  if (parsed.sourceType === "purchase_order" && !parsed.purchaseId) {
    throw new ValidationError('sourceType "purchase_order" requires a purchaseId.');
  }

  try {
    const result = await warehouseReceivingRepository.createWithLines(parsed, userId);
    await logWarehouseAudit("warehouse_receiving.created", "warehouse_receiving_records", result.record.id, {
      warehouseId: parsed.warehouseId,
      sourceType: parsed.sourceType,
      lineCount: parsed.lines.length,
    });
    return result;
  } catch (error) {
    throw toWarehouseError(error, "Receiving record");
  }
}

// Rule: equipment/consumable state never changes by direct table write here.
// complete_warehouse_receiving_line (0040) is the sole path — it plays the same audited,
// permission-checked equipment-lifecycle-boundary role as equipmentItemService.transferEquipmentItem,
// atomically placing the line's unit/quantity AND marking the receiving record complete once
// every line is placed. See warehouse-transfer-service.ts's executeTransfer for the same
// reasoning in more detail.
async function completeReceivingLine(lineId: string): Promise<WarehouseReceivingLineRow> {
  await assertAnyPermission(["warehouse.manage", "warehouse.receive"]);
  await requireLine(lineId);

  try {
    const line = await warehouseReceivingRepository.completeLineViaTransaction(lineId);
    await logWarehouseAudit("warehouse_receiving.line_completed", "warehouse_receiving_lines", lineId, {
      itemId: line.item_id,
      modelId: line.model_id,
    });
    return line;
  } catch (error) {
    throw toWarehouseError(error, "Receiving line");
  }
}

// Damage discovered during inspection is filed through Inventory's existing
// incidentService.createDamageReport (Module 2) — the same integration principle the
// spec asks for equipment lifecycle: Warehouse never invents a second damage-report table
// or workflow, it links to the one that already exists.
async function recordLineDamage(
  lineId: string,
  input: { description: string; severity: "minor" | "major" | "critical"; repairCost?: number; currencyCode?: string }
): Promise<WarehouseReceivingLineRow> {
  await assertAnyPermission(["warehouse.manage", "warehouse.receive"]);
  const line = await requireLine(lineId);
  if (!line.item_id) {
    throw new ConflictError("Damage reports can only be filed against individually-tracked item lines.");
  }

  const report = await incidentService.createDamageReport({
    itemId: line.item_id,
    description: input.description,
    severity: input.severity,
    repairCost: input.repairCost,
    currencyCode: input.currencyCode,
  });

  await warehouseReceivingRepository.setLineDamageReport(lineId, report.id);
  await logWarehouseAudit("warehouse_receiving.line_damage_recorded", "warehouse_receiving_lines", lineId, {
    damageReportId: report.id,
  });

  return requireLine(lineId);
}

export const receivingService = { createReceiving, completeReceivingLine, recordLineDamage };
