import "server-only";
import { assertAnyPermission } from "@/modules/warehouse/shared/authorize";
import { logWarehouseAudit } from "@/modules/warehouse/shared/audit";
import {
  ConflictError,
  EquipmentNotAvailableError,
  InvalidTransferStateError,
  NotFoundError,
  ValidationError,
  toWarehouseError,
} from "@/modules/warehouse/errors";
import {
  createTransferRequestSchema,
  rejectTransferSchema,
  cancelTransferSchema,
  type CreateTransferRequestInput,
  type RejectTransferInput,
  type CancelTransferInput,
} from "@/modules/warehouse/schemas/warehouse-transfer-schema";
import {
  warehouseTransferRepository,
  type WarehouseTransferRow,
  type WarehouseTransferLineRow,
} from "@/modules/warehouse/repositories/warehouse-transfer-repository";
import { equipmentItemRepository } from "@/modules/inventory/repositories/equipment-item-repository";

const UNAVAILABLE_STATUSES = new Set(["retired", "lost", "in_maintenance"]);

async function requireTransfer(id: string): Promise<WarehouseTransferRow> {
  const transfer = await warehouseTransferRepository.findById(id);
  if (!transfer) throw new NotFoundError("Warehouse transfer");
  return transfer;
}

// "Create transfer request" and "submit transfer" from the spec collapse into this one
// step: the schema's status default is already 'pending' ("submitted, awaiting approval") —
// there's no separate draft state in the approved Module 3.1 schema, and this phase may not
// modify it. A transfer is submitted the moment it's created.
async function createTransferRequest(input: CreateTransferRequestInput): Promise<{
  transfer: WarehouseTransferRow;
  lines: WarehouseTransferLineRow[];
}> {
  const userId = await assertAnyPermission(["warehouse.manage", "warehouse.transfer"]);
  const parsed = createTransferRequestSchema.parse(input);

  if (parsed.fromWarehouseId === parsed.toWarehouseId && parsed.fromLocationId === parsed.toLocationId) {
    throw new ValidationError("Source and destination must differ.");
  }

  for (const line of parsed.lines) {
    if (line.itemId) {
      const item = await equipmentItemRepository.findById(line.itemId);
      if (!item) throw new NotFoundError("Equipment item");
      if (UNAVAILABLE_STATUSES.has(item.current_status)) {
        throw new EquipmentNotAvailableError(
          `Item ${item.asset_tag} can't be transferred (status: ${item.current_status}).`
        );
      }
    }
  }

  try {
    const result = await warehouseTransferRepository.createWithLines(parsed, userId);
    await logWarehouseAudit("warehouse_transfer.requested", "warehouse_transfers", result.transfer.id, {
      fromWarehouseId: parsed.fromWarehouseId,
      toWarehouseId: parsed.toWarehouseId,
      lineCount: parsed.lines.length,
    });
    return result;
  } catch (error) {
    throw toWarehouseError(error, "Warehouse transfer");
  }
}

async function approveTransfer(id: string): Promise<WarehouseTransferRow> {
  await assertAnyPermission(["warehouse.manage", "warehouse.approve"]);
  const transfer = await requireTransfer(id);

  if (transfer.status !== "pending") {
    throw new InvalidTransferStateError(`Transfer is "${transfer.status}", not pending — can't approve it.`);
  }

  try {
    // approve_warehouse_transfer (0040) re-checks the permission itself; the assertion
    // above is a fast-fail for a friendlier error.
    const updated = await warehouseTransferRepository.approveViaTransaction(id);
    await logWarehouseAudit("warehouse_transfer.approved", "warehouse_transfers", id);
    return updated;
  } catch (error) {
    throw toWarehouseError(error, "Warehouse transfer");
  }
}

async function rejectTransfer(id: string, input: RejectTransferInput): Promise<WarehouseTransferRow> {
  const userId = await assertAnyPermission(["warehouse.manage", "warehouse.approve"]);
  const parsed = rejectTransferSchema.parse(input);
  const transfer = await requireTransfer(id);

  if (transfer.status !== "pending") {
    throw new InvalidTransferStateError(`Transfer is "${transfer.status}", not pending — can't reject it.`);
  }

  // No separate "rejected" status exists in the approved schema (pending|approved|
  // in_transit|completed|cancelled) — rejection is recorded as cancelled, distinguished
  // from a plain cancel only by the audit action name and the reason text.
  const updated = await warehouseTransferRepository.updateStatus(
    id,
    "cancelled",
    userId,
    `Rejected: ${parsed.reason}`
  );
  await logWarehouseAudit("warehouse_transfer.rejected", "warehouse_transfers", id, {
    reason: parsed.reason,
  });
  return updated;
}

async function cancelTransfer(id: string, input: CancelTransferInput): Promise<WarehouseTransferRow> {
  const userId = await assertAnyPermission(["warehouse.manage", "warehouse.transfer"]);
  const parsed = cancelTransferSchema.parse(input);
  const transfer = await requireTransfer(id);

  if (transfer.status === "completed" || transfer.status === "cancelled") {
    throw new InvalidTransferStateError(`Transfer is already "${transfer.status}".`);
  }

  const updated = await warehouseTransferRepository.updateStatus(id, "cancelled", userId, parsed.reason);

  const lines = await warehouseTransferRepository.findLines(id);
  for (const line of lines.filter((l) => l.status === "pending")) {
    await warehouseTransferRepository.updateLineStatus(line.id, "cancelled");
  }

  await logWarehouseAudit("warehouse_transfer.cancelled", "warehouse_transfers", id, {
    reason: parsed.reason,
  });
  return updated;
}

// Rules honored here: no direct equipment_items/consumable_stock_levels writes happen in
// this file. Every unit moves through complete_warehouse_transfer_line (0040) — the same
// SECURITY DEFINER, explicit-permission-checked, audited transactional function that plays
// the equipment-lifecycle-boundary role for warehouse-originated moves, exactly like
// equipmentItemService's own transferEquipmentItem does for direct Inventory moves. It's
// used here (rather than calling equipmentItemService per line) because one transfer can
// mix individually-tracked items and consumable quantities and must complete atomically,
// including auto-completing the header — splitting that across two service calls would
// break the single-transaction guarantee. Every completed line still lands in the same
// canonical equipment_item_movements ledger (movement history) and this function still logs
// its own audit entry.
async function executeTransfer(id: string): Promise<{
  transfer: WarehouseTransferRow;
  lines: WarehouseTransferLineRow[];
}> {
  await assertAnyPermission(["warehouse.manage", "warehouse.transfer"]);
  const transfer = await requireTransfer(id);

  if (transfer.status !== "approved" && transfer.status !== "in_transit") {
    throw new InvalidTransferStateError(
      `Transfer is "${transfer.status}" — it must be approved before it can be executed.`
    );
  }

  const lines = await warehouseTransferRepository.findLines(id);
  const pendingLines = lines.filter((l) => l.status === "pending");
  if (pendingLines.length === 0) {
    throw new ConflictError("This transfer has no pending lines left to execute.");
  }

  const completed: WarehouseTransferLineRow[] = [];
  try {
    for (const line of pendingLines) {
      completed.push(await warehouseTransferRepository.completeLineViaTransaction(line.id));
    }
  } catch (error) {
    throw toWarehouseError(error, "Warehouse transfer line");
  }

  await logWarehouseAudit("warehouse_transfer.executed", "warehouse_transfers", id, {
    linesCompleted: completed.length,
  });

  const updated = await requireTransfer(id);
  return { transfer: updated, lines: await warehouseTransferRepository.findLines(id) };
}

export const warehouseTransferService = {
  createTransferRequest,
  approveTransfer,
  rejectTransfer,
  cancelTransfer,
  executeTransfer,
};
