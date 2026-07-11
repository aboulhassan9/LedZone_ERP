import "server-only";
import { assertAnyPermission } from "@/modules/warehouse/shared/authorize";
import { logWarehouseAudit } from "@/modules/warehouse/shared/audit";
import { ConflictError, NotFoundError, toWarehouseError } from "@/modules/warehouse/errors";
import {
  createPickListSchema,
  completePickLineSchema,
  type CreatePickListInput,
  type CompletePickLineInput,
} from "@/modules/warehouse/schemas/warehouse-picking-schema";
import {
  warehousePickingRepository,
  type WarehousePickListRow,
  type WarehousePickListLineRow,
} from "@/modules/warehouse/repositories/warehouse-picking-repository";
import { reservationService } from "@/modules/warehouse/services/reservation-service";
import { equipmentItemService } from "@/modules/inventory/services/equipment-item-service";

const PICK_RESERVATION_WINDOW_MS = 24 * 60 * 60 * 1000; // 24h

async function requirePickList(id: string): Promise<WarehousePickListRow> {
  const pickList = await warehousePickingRepository.findById(id);
  if (!pickList) throw new NotFoundError("Pick list");
  return pickList;
}

async function requireLine(lineId: string): Promise<WarehousePickListLineRow> {
  const line = await warehousePickingRepository.findLineById(lineId);
  if (!line) throw new NotFoundError("Pick list line");
  return line;
}

// "Reserve items" (spec responsibility) — every item line gets a short-lived reservation so
// nothing else claims it while it's being picked, delegated to ReservationService rather than
// duplicating double-booking logic here.
async function createPickList(input: CreatePickListInput): Promise<{
  pickList: WarehousePickListRow;
  lines: WarehousePickListLineRow[];
}> {
  const userId = await assertAnyPermission(["warehouse.manage", "warehouse.pick"]);
  const parsed = createPickListSchema.parse(input);

  try {
    const result = await warehousePickingRepository.createWithLines(parsed, userId);

    for (const line of result.lines) {
      if (line.item_id) {
        await reservationService.createReservation({
          itemId: line.item_id,
          reservedForType: "high_priority",
          expiresAt: new Date(Date.now() + PICK_RESERVATION_WINDOW_MS).toISOString(),
          referenceNote: `Pick list ${result.pickList.id}`,
        });
      }
    }

    await logWarehouseAudit("warehouse_pick_list.created", "warehouse_pick_lists", result.pickList.id, {
      warehouseId: parsed.warehouseId,
      method: parsed.method,
      lineCount: parsed.lines.length,
    });
    return result;
  } catch (error) {
    throw toWarehouseError(error, "Pick list");
  }
}

// Rule: relocation (when a staging destination is given) goes through
// equipmentItemService.pickEquipmentItem — EquipmentLifecycleService — never a direct table
// write. Marking the line picked is warehouse-local bookkeeping only.
async function completePickLine(
  lineId: string,
  input: CompletePickLineInput
): Promise<WarehousePickListLineRow> {
  await assertAnyPermission(["warehouse.manage", "warehouse.pick"]);
  const parsed = completePickLineSchema.parse(input);
  const line = await requireLine(lineId);

  if (line.picked) {
    throw new ConflictError("This line has already been picked.");
  }

  if (line.item_id && parsed.toWarehouseLocationId) {
    await equipmentItemService.pickEquipmentItem(line.item_id, {
      toWarehouseLocationId: parsed.toWarehouseLocationId,
      reason: parsed.reason,
    });
  }

  const updated = await warehousePickingRepository.markLinePicked(lineId);
  await logWarehouseAudit("warehouse_pick_list.line_picked", "warehouse_pick_list_lines", lineId, {
    itemId: line.item_id,
    modelId: line.model_id,
  });

  const remaining = await warehousePickingRepository.findLines(line.pick_list_id);
  if (remaining.every((l) => l.picked)) {
    await warehousePickingRepository.updateStatus(line.pick_list_id, "completed");
    await logWarehouseAudit(
      "warehouse_pick_list.completed",
      "warehouse_pick_lists",
      line.pick_list_id
    );
  }

  return updated;
}

async function startPickList(id: string): Promise<WarehousePickListRow> {
  await assertAnyPermission(["warehouse.manage", "warehouse.pick"]);
  await requirePickList(id);
  const updated = await warehousePickingRepository.updateStatus(id, "in_progress");
  await logWarehouseAudit("warehouse_pick_list.started", "warehouse_pick_lists", id);
  return updated;
}

export const pickingService = { createPickList, completePickLine, startPickList };
