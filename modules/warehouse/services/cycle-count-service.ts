import "server-only";
import { assertAnyPermission } from "@/modules/warehouse/shared/authorize";
import { logWarehouseAudit } from "@/modules/warehouse/shared/audit";
import { ConflictError, NotFoundError, ValidationError, toWarehouseError } from "@/modules/warehouse/errors";
import {
  createCycleCountSchema,
  recordCountSchema,
  type CreateCycleCountInput,
  type RecordCountInput,
} from "@/modules/warehouse/schemas/warehouse-cycle-count-schema";
import {
  warehouseCycleCountRepository,
  type WarehouseCycleCountRow,
  type WarehouseCycleCountLineRow,
} from "@/modules/warehouse/repositories/warehouse-cycle-count-repository";
import { incidentService } from "@/modules/inventory/services/incident-service";

async function requireCycleCount(id: string): Promise<WarehouseCycleCountRow> {
  const cycleCount = await warehouseCycleCountRepository.findById(id);
  if (!cycleCount) throw new NotFoundError("Cycle count");
  return cycleCount;
}

async function requireLine(lineId: string): Promise<WarehouseCycleCountLineRow> {
  const line = await warehouseCycleCountRepository.findLineById(lineId);
  if (!line) throw new NotFoundError("Cycle count line");
  return line;
}

async function createCycleCount(input: CreateCycleCountInput): Promise<{
  cycleCount: WarehouseCycleCountRow;
  lines: WarehouseCycleCountLineRow[];
}> {
  const userId = await assertAnyPermission(["warehouse.manage", "warehouse.count"]);
  const parsed = createCycleCountSchema.parse(input);

  try {
    const result = await warehouseCycleCountRepository.createWithLines(parsed, userId);
    await logWarehouseAudit("warehouse_cycle_count.created", "warehouse_cycle_counts", result.cycleCount.id, {
      warehouseId: parsed.warehouseId,
      scopeType: parsed.scopeType,
      lineCount: parsed.lines.length,
    });
    return result;
  } catch (error) {
    throw toWarehouseError(error, "Cycle count");
  }
}

async function startCycleCount(id: string): Promise<WarehouseCycleCountRow> {
  const userId = await assertAnyPermission(["warehouse.manage", "warehouse.count"]);
  const cycleCount = await requireCycleCount(id);

  if (cycleCount.status !== "scheduled") {
    throw new ConflictError(`Cycle count is "${cycleCount.status}", not scheduled.`);
  }

  const updated = await warehouseCycleCountRepository.updateStatus(id, "in_progress", userId);
  await logWarehouseAudit("warehouse_cycle_count.started", "warehouse_cycle_counts", id);
  return updated;
}

// "Compare expected vs actual quantities, Record discrepancies" — variance is a DB generated
// column (counted_qty - expected_qty), so recording the count is all this needs to do; the
// discrepancy itself is derived, never computed here (can't drift).
async function recordCount(lineId: string, input: RecordCountInput): Promise<WarehouseCycleCountLineRow> {
  await assertAnyPermission(["warehouse.manage", "warehouse.count"]);
  const parsed = recordCountSchema.parse(input);
  await requireLine(lineId);

  const line = await warehouseCycleCountRepository.recordLineCount(lineId, parsed.countedQty);
  await logWarehouseAudit("warehouse_cycle_count.line_counted", "warehouse_cycle_count_lines", lineId, {
    countedQty: parsed.countedQty,
    variance: line.variance,
  });
  return line;
}

async function submitForApproval(id: string): Promise<WarehouseCycleCountRow> {
  const userId = await assertAnyPermission(["warehouse.manage", "warehouse.count"]);
  const cycleCount = await requireCycleCount(id);

  if (cycleCount.status !== "in_progress" && cycleCount.status !== "scheduled") {
    throw new ConflictError(`Cycle count is "${cycleCount.status}" — can't submit it for approval.`);
  }

  const lines = await warehouseCycleCountRepository.findLines(id);
  if (lines.some((l) => l.counted_qty == null)) {
    throw new ValidationError("Every line must be counted before submitting for approval.");
  }

  const updated = await warehouseCycleCountRepository.updateStatus(id, "pending_approval", userId);
  await logWarehouseAudit("warehouse_cycle_count.submitted", "warehouse_cycle_counts", id);
  return updated;
}

// Rule: consumable variance is applied through apply_warehouse_cycle_count_adjustment
// (0040) — the audited transactional boundary for consumable_stock_levels, same pattern as
// every other Warehouse mutation of shared Inventory data. An individually-tracked item
// that's short (variance < 0, i.e. not found) gets a lost report filed through Inventory's
// existing incidentService.createLostReport — again, integration with the existing service
// rather than a second "missing item" workflow.
async function approveCycleCount(id: string): Promise<WarehouseCycleCountRow> {
  const userId = await assertAnyPermission(["warehouse.manage", "warehouse.approve"]);
  const cycleCount = await requireCycleCount(id);

  if (cycleCount.status !== "pending_approval") {
    throw new ConflictError(`Cycle count is "${cycleCount.status}", not pending approval.`);
  }

  const lines = await warehouseCycleCountRepository.findLines(id);
  try {
    for (const line of lines) {
      if (line.adjustment_applied || line.variance === 0 || line.variance == null) continue;

      if (line.model_id) {
        await warehouseCycleCountRepository.applyAdjustmentViaTransaction(line.id);
      } else if (line.item_id && line.variance < 0) {
        await incidentService.createLostReport({
          itemId: line.item_id,
          description: `Missing during cycle count ${id} (expected ${line.expected_qty}, counted ${line.counted_qty}).`,
        });
      }
    }
  } catch (error) {
    throw toWarehouseError(error, "Cycle count line");
  }

  const updated = await warehouseCycleCountRepository.updateStatus(id, "approved", userId);
  await logWarehouseAudit("warehouse_cycle_count.approved", "warehouse_cycle_counts", id, {
    lineCount: lines.length,
  });
  return updated;
}

export const cycleCountService = {
  createCycleCount,
  startCycleCount,
  recordCount,
  submitForApproval,
  approveCycleCount,
};
