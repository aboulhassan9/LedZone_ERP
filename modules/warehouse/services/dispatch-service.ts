import "server-only";
import { assertAnyPermission } from "@/modules/warehouse/shared/authorize";
import { logWarehouseAudit } from "@/modules/warehouse/shared/audit";
import {
  EquipmentNotAvailableError,
  InsufficientStockError,
  NotFoundError,
  toWarehouseError,
} from "@/modules/warehouse/errors";
import {
  createDispatchSchema,
  type CreateDispatchInput,
} from "@/modules/warehouse/schemas/warehouse-dispatch-schema";
import {
  warehouseDispatchRepository,
  type WarehouseDispatchRow,
  type WarehouseDispatchLineRow,
} from "@/modules/warehouse/repositories/warehouse-dispatch-repository";
import { equipmentItemRepository } from "@/modules/inventory/repositories/equipment-item-repository";

const AVAILABLE_FOR_DISPATCH = new Set(["available", "reserved", "picked"]);

async function requireDispatch(id: string): Promise<WarehouseDispatchRow> {
  const record = await warehouseDispatchRepository.findById(id);
  if (!record) throw new NotFoundError("Dispatch record");
  return record;
}

async function createDispatch(input: CreateDispatchInput): Promise<{
  record: WarehouseDispatchRow;
  lines: WarehouseDispatchLineRow[];
}> {
  const userId = await assertAnyPermission(["warehouse.manage", "warehouse.dispatch"]);
  const parsed = createDispatchSchema.parse(input);

  for (const line of parsed.lines) {
    if (line.itemId) {
      const item = await equipmentItemRepository.findById(line.itemId);
      if (!item) throw new NotFoundError("Equipment item");
      if (!AVAILABLE_FOR_DISPATCH.has(item.current_status)) {
        throw new EquipmentNotAvailableError(
          `Item ${item.asset_tag} is not available to dispatch (status: ${item.current_status}).`
        );
      }
    } else if (line.modelId && line.sourceWarehouseLocationId) {
      const onHand = await warehouseDispatchRepository.findConsumableQuantityOnHand(
        line.modelId,
        line.sourceWarehouseLocationId
      );
      if ((line.quantity ?? 0) > onHand) {
        throw new InsufficientStockError(
          `Only ${onHand} unit(s) on hand for this consumable at the selected location (requested ${line.quantity}).`
        );
      }
    }
  }

  try {
    const result = await warehouseDispatchRepository.createWithLines(parsed, userId);
    await logWarehouseAudit("warehouse_dispatch.created", "warehouse_dispatch_records", result.record.id, {
      warehouseId: parsed.warehouseId,
      destinationType: parsed.destinationType,
      lineCount: parsed.lines.length,
    });
    return result;
  } catch (error) {
    throw toWarehouseError(error, "Dispatch record");
  }
}

// Rule: no direct equipment_items/consumable_stock_levels writes here — every line goes
// through complete_warehouse_dispatch_line (0040), the same audited transactional boundary
// used throughout this module (see warehouse-transfer-service.ts's executeTransfer for the
// full reasoning). That function now independently re-validates the item's status
// transition to in_transit via assert_equipment_status_transition() immediately before this
// write — closing the gap where createDispatch's availability check (above) was the only
// check, and could go stale between dispatch creation and line completion.
async function completeDispatchLine(dispatchId: string, lineId: string): Promise<WarehouseDispatchLineRow> {
  await assertAnyPermission(["warehouse.manage", "warehouse.dispatch"]);
  await requireDispatch(dispatchId);

  try {
    const line = await warehouseDispatchRepository.completeLineViaTransaction(lineId);
    await logWarehouseAudit("warehouse_dispatch.line_completed", "warehouse_dispatch_lines", lineId, {
      itemId: line.item_id,
      modelId: line.model_id,
    });
    return line;
  } catch (error) {
    throw toWarehouseError(error, "Dispatch line");
  }
}

async function attachSignature(dispatchId: string, signatureUrl: string): Promise<void> {
  const userId = await assertAnyPermission(["warehouse.manage", "warehouse.dispatch"]);
  await requireDispatch(dispatchId);
  await warehouseDispatchRepository.setSignatureUrl(dispatchId, signatureUrl, userId);
  await logWarehouseAudit("warehouse_dispatch.signature_attached", "warehouse_dispatch_records", dispatchId);
}

export const dispatchService = { createDispatch, completeDispatchLine, attachSignature };
