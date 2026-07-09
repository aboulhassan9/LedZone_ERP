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

const UNAVAILABLE_STATUSES = new Set(["scrapped", "lost", "in_maintenance"]);
// Terminal or in-flight states a cancel can't touch.
const NON_CANCELLABLE = new Set(["completed", "cancelled", "rejected", "failed"]);

async function requireTransfer(id: string): Promise<WarehouseTransferRow> {
  const transfer = await warehouseTransferRepository.findById(id);
  if (!transfer) throw new NotFoundError("Warehouse transfer");
  return transfer;
}

// Lifecycle (0043): draft -> submitted -> approved -> in_transit -> completed, with
// submitted -> rejected and (draft|submitted|approved|in_transit) -> cancelled side
// branches, and approved|in_transit -> failed if execution errors out partway through.
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
    // Created as 'draft' (the table's new default) — nothing is submitted for approval
    // until submitTransfer() is called.
    const result = await warehouseTransferRepository.createWithLines(parsed, userId);
    await logWarehouseAudit("warehouse_transfer.drafted", "warehouse_transfers", result.transfer.id, {
      fromWarehouseId: parsed.fromWarehouseId,
      toWarehouseId: parsed.toWarehouseId,
      lineCount: parsed.lines.length,
    });
    return result;
  } catch (error) {
    throw toWarehouseError(error, "Warehouse transfer");
  }
}

async function submitTransfer(id: string): Promise<WarehouseTransferRow> {
  const userId = await assertAnyPermission(["warehouse.manage", "warehouse.transfer"]);
  const transfer = await requireTransfer(id);

  if (transfer.status !== "draft") {
    throw new InvalidTransferStateError(`Transfer is "${transfer.status}", not draft — can't submit it.`);
  }

  const lines = await warehouseTransferRepository.findLines(id);
  if (lines.length === 0) {
    throw new ValidationError("A transfer needs at least one line before it can be submitted.");
  }

  const updated = await warehouseTransferRepository.updateStatus(id, "submitted", userId);
  await logWarehouseAudit("warehouse_transfer.submitted", "warehouse_transfers", id);
  return updated;
}

async function approveTransfer(id: string): Promise<WarehouseTransferRow> {
  await assertAnyPermission(["warehouse.manage", "warehouse.approve"]);
  const transfer = await requireTransfer(id);

  if (transfer.status !== "submitted") {
    throw new InvalidTransferStateError(`Transfer is "${transfer.status}", not submitted — can't approve it.`);
  }

  try {
    // approve_warehouse_transfer (0043) re-checks the permission itself; the assertion
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

  if (transfer.status !== "submitted") {
    throw new InvalidTransferStateError(`Transfer is "${transfer.status}", not submitted — can't reject it.`);
  }

  const updated = await warehouseTransferRepository.updateStatus(id, "rejected", userId, parsed.reason);
  await logWarehouseAudit("warehouse_transfer.rejected", "warehouse_transfers", id, {
    reason: parsed.reason,
  });
  return updated;
}

async function cancelTransfer(id: string, input: CancelTransferInput): Promise<WarehouseTransferRow> {
  const userId = await assertAnyPermission(["warehouse.manage", "warehouse.transfer"]);
  const parsed = cancelTransferSchema.parse(input);
  const transfer = await requireTransfer(id);

  if (NON_CANCELLABLE.has(transfer.status)) {
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
// canonical equipment_item_movements ledger (movement history), and if any line fails
// partway through, the transfer header is marked 'failed' (0043) rather than left silently
// stuck in 'approved'/'in_transit'.
async function executeTransfer(id: string): Promise<{
  transfer: WarehouseTransferRow;
  lines: WarehouseTransferLineRow[];
}> {
  const userId = await assertAnyPermission(["warehouse.manage", "warehouse.transfer"]);
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
    await warehouseTransferRepository.updateStatus(
      id,
      "failed",
      userId,
      `Execution failed after completing ${completed.length}/${pendingLines.length} line(s): ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    await logWarehouseAudit("warehouse_transfer.failed", "warehouse_transfers", id, {
      linesCompleted: completed.length,
      linesAttempted: pendingLines.length,
    });
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
  submitTransfer,
  approveTransfer,
  rejectTransfer,
  cancelTransfer,
  executeTransfer,
};
