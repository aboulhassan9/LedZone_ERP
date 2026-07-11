import "server-only";
import { assertPermission, assertAnyPermission } from "@/modules/inventory/shared/authorize";
import { logInventoryAudit } from "@/modules/inventory/shared/audit";
import { ConflictError, NotFoundError, toInventoryError } from "@/modules/inventory/errors";
import { assertEquipmentStatusTransition } from "@/modules/inventory/lifecycle/equipment-status-transitions";
import {
  createEquipmentItemSchema,
  updateEquipmentItemSchema,
  transferEquipmentItemSchema,
  checkOutEquipmentItemSchema,
  checkInEquipmentItemSchema,
  warehouseItemMovementSchema,
  bulkWarehouseMoveSchema,
  type CreateEquipmentItemInput,
  type UpdateEquipmentItemInput,
  type TransferEquipmentItemInput,
  type CheckOutEquipmentItemInput,
  type CheckInEquipmentItemInput,
  type WarehouseItemMovementInput,
  type BulkWarehouseMoveInput,
} from "@/modules/inventory/schemas/equipment-item-schema";
import {
  equipmentItemRepository,
  type EquipmentItemRow,
  type EquipmentItemMovementRow,
} from "@/modules/inventory/repositories/equipment-item-repository";

async function createEquipmentItem(input: CreateEquipmentItemInput): Promise<EquipmentItemRow> {
  await assertPermission("inventory.manage");
  const parsed = createEquipmentItemSchema.parse(input);
  try {
    const item = await equipmentItemRepository.createViaTransaction(parsed);
    await logInventoryAudit("equipment_item.created", "equipment_items", item.id, {
      assetTag: item.asset_tag,
      modelId: parsed.modelId,
    });
    return item;
  } catch (error) {
    throw toInventoryError(error, "Equipment item");
  }
}

async function requireItem(id: string): Promise<EquipmentItemRow> {
  const item = await equipmentItemRepository.findById(id);
  if (!item) throw new NotFoundError("Equipment item");
  return item;
}

async function updateEquipmentItem(
  id: string,
  input: UpdateEquipmentItemInput
): Promise<EquipmentItemRow> {
  const userId = await assertPermission("inventory.manage");
  const parsed = updateEquipmentItemSchema.parse(input);
  await requireItem(id);
  try {
    const item = await equipmentItemRepository.update(id, parsed, userId);
    await logInventoryAudit("equipment_item.updated", "equipment_items", id, parsed);
    return item;
  } catch (error) {
    throw toInventoryError(error, "Equipment item");
  }
}

async function archiveEquipmentItem(id: string): Promise<void> {
  await assertPermission("inventory.manage");
  const item = await requireItem(id);

  if (item.current_status === "in_use" || item.current_status === "reserved") {
    throw new ConflictError(
      `Cannot archive an item that is currently ${item.current_status}. Check it in first.`
    );
  }
  assertEquipmentStatusTransition(item.current_status, "scrapped", (m) => new ConflictError(m));

  try {
    await equipmentItemRepository.archive(id);
    await logInventoryAudit("equipment_item.archived", "equipment_items", id);
  } catch (error) {
    throw toInventoryError(error, "Equipment item");
  }
}

async function transferEquipmentItem(
  id: string,
  input: TransferEquipmentItemInput
): Promise<EquipmentItemMovementRow> {
  await assertAnyPermission(["inventory.transfer", "inventory.manage"]);
  const parsed = transferEquipmentItemSchema.parse(input);
  const item = await requireItem(id);

  if (item.current_status === "lost") {
    throw new ConflictError(`Cannot transfer an item with status "${item.current_status}".`);
  }
  assertEquipmentStatusTransition(item.current_status, item.current_status, (m) => new ConflictError(m));

  try {
    const movement = await equipmentItemRepository.recordMovementViaTransaction(
      id,
      parsed.toStorageLocationId,
      "transfer",
      parsed.referenceNote ?? null
    );
    await logInventoryAudit("equipment_item.transferred", "equipment_items", id, {
      toStorageLocationId: parsed.toStorageLocationId,
    });
    return movement;
  } catch (error) {
    throw toInventoryError(error, "Equipment item");
  }
}

async function checkOutEquipmentItem(
  id: string,
  input: CheckOutEquipmentItemInput
): Promise<EquipmentItemMovementRow> {
  await assertAnyPermission(["inventory.checkout", "inventory.manage"]);
  const parsed = checkOutEquipmentItemSchema.parse(input);
  const item = await requireItem(id);

  // Deliberately a strict equality check, not the general assertEquipmentStatusTransition:
  // "available -> in_use" is one of several valid ways to reach in_use in the abstract
  // state machine, but checkout specifically must only ever start from available.
  if (item.current_status !== "available") {
    throw new ConflictError(
      `Item is not available for checkout (current status: ${item.current_status}).`
    );
  }

  try {
    const movement = await equipmentItemRepository.recordMovementViaTransaction(
      id,
      parsed.toStorageLocationId,
      "check_out",
      parsed.referenceNote ?? null
    );
    await logInventoryAudit("equipment_item.checked_out", "equipment_items", id, {
      toStorageLocationId: parsed.toStorageLocationId,
    });
    return movement;
  } catch (error) {
    throw toInventoryError(error, "Equipment item");
  }
}

async function checkInEquipmentItem(
  id: string,
  input: CheckInEquipmentItemInput
): Promise<EquipmentItemMovementRow> {
  await assertAnyPermission(["inventory.checkin", "inventory.manage"]);
  const parsed = checkInEquipmentItemSchema.parse(input);
  const item = await requireItem(id);

  // Strict equality, not the general guard: in_maintenance/inspection can also reach
  // available, but only via their own dedicated completion flows, never via check-in.
  if (item.current_status !== "in_use") {
    throw new ConflictError(
      `Item is not checked out, so it can't be checked in (current status: ${item.current_status}).`
    );
  }

  try {
    const movement = await equipmentItemRepository.recordMovementViaTransaction(
      id,
      parsed.toStorageLocationId,
      "check_in",
      parsed.referenceNote ?? null
    );
    await logInventoryAudit("equipment_item.checked_in", "equipment_items", id, {
      toStorageLocationId: parsed.toStorageLocationId,
    });
    return movement;
  } catch (error) {
    throw toInventoryError(error, "Equipment item");
  }
}

// --- Warehouse-triggered movement types (Module 3) ---------------------------------------
// These still flow through this service (EquipmentLifecycleService) like every other state
// change; only the addressing differs (a warehouse_locations node, resolved by the caller in
// modules/warehouse/services/*.ts, instead of a storage_locations row).

async function putAwayEquipmentItem(
  id: string,
  input: WarehouseItemMovementInput
): Promise<EquipmentItemMovementRow> {
  await assertAnyPermission(["warehouse.pick", "warehouse.manage"]);
  const parsed = warehouseItemMovementSchema.parse(input);
  const item = await requireItem(id);

  assertEquipmentStatusTransition(item.current_status, "available", (m) => new ConflictError(m));

  try {
    const movement = await equipmentItemRepository.recordWarehouseMovementViaTransaction(
      id,
      parsed.toWarehouseLocationId,
      "put_away",
      parsed.reason ?? null,
      "available"
    );
    await logInventoryAudit("equipment_item.put_away", "equipment_items", id, {
      toWarehouseLocationId: parsed.toWarehouseLocationId,
    });
    return movement;
  } catch (error) {
    throw toInventoryError(error, "Equipment item");
  }
}

async function pickEquipmentItem(
  id: string,
  input: WarehouseItemMovementInput
): Promise<EquipmentItemMovementRow> {
  await assertAnyPermission(["warehouse.pick", "warehouse.manage"]);
  const parsed = warehouseItemMovementSchema.parse(input);
  const item = await requireItem(id);

  assertEquipmentStatusTransition(
    item.current_status,
    "picked",
    (m) => new ConflictError(`Item is not available to pick (current status: ${item.current_status}). ${m}`)
  );

  try {
    const movement = await equipmentItemRepository.recordWarehouseMovementViaTransaction(
      id,
      parsed.toWarehouseLocationId,
      "pick",
      parsed.reason ?? null,
      "picked"
    );
    await logInventoryAudit("equipment_item.picked", "equipment_items", id, {
      toWarehouseLocationId: parsed.toWarehouseLocationId,
    });
    return movement;
  } catch (error) {
    throw toInventoryError(error, "Equipment item");
  }
}

async function quarantineEquipmentItem(
  id: string,
  input: WarehouseItemMovementInput
): Promise<EquipmentItemMovementRow> {
  await assertAnyPermission(["warehouse.location.manage", "warehouse.manage"]);
  const parsed = warehouseItemMovementSchema.parse(input);
  const item = await requireItem(id);

  assertEquipmentStatusTransition(item.current_status, "quarantined", (m) => new ConflictError(m));

  try {
    const movement = await equipmentItemRepository.recordWarehouseMovementViaTransaction(
      id,
      parsed.toWarehouseLocationId,
      "quarantine",
      parsed.reason ?? null,
      "quarantined"
    );
    await logInventoryAudit("equipment_item.quarantined", "equipment_items", id, {
      toWarehouseLocationId: parsed.toWarehouseLocationId,
      reason: parsed.reason,
    });
    return movement;
  } catch (error) {
    throw toInventoryError(error, "Equipment item");
  }
}

// "Release from quarantine" moves a quarantined item into active maintenance — not
// straight back to available (that's completeMaintenanceEquipmentItem's job, via
// maintenanceService.createMaintenanceRecord's markItemAvailable flag). Quarantined ->
// Maintenance -> Available, per the explicit state machine.
async function releaseFromQuarantineEquipmentItem(
  id: string,
  input: WarehouseItemMovementInput
): Promise<EquipmentItemMovementRow> {
  await assertAnyPermission(["warehouse.location.manage", "warehouse.manage"]);
  const parsed = warehouseItemMovementSchema.parse(input);
  const item = await requireItem(id);

  assertEquipmentStatusTransition(item.current_status, "in_maintenance", (m) => new ConflictError(m));

  try {
    const movement = await equipmentItemRepository.recordWarehouseMovementViaTransaction(
      id,
      parsed.toWarehouseLocationId,
      "release",
      parsed.reason ?? null,
      "in_maintenance"
    );
    await logInventoryAudit("equipment_item.released_from_quarantine", "equipment_items", id, {
      toWarehouseLocationId: parsed.toWarehouseLocationId,
    });
    return movement;
  } catch (error) {
    throw toInventoryError(error, "Equipment item");
  }
}

async function scrapEquipmentItem(
  id: string,
  input: WarehouseItemMovementInput
): Promise<EquipmentItemMovementRow> {
  await assertPermission("warehouse.manage");
  const parsed = warehouseItemMovementSchema.parse(input);
  const item = await requireItem(id);

  assertEquipmentStatusTransition(item.current_status, "scrapped", (m) => new ConflictError(m));

  try {
    const movement = await equipmentItemRepository.recordWarehouseMovementViaTransaction(
      id,
      parsed.toWarehouseLocationId,
      "scrap",
      parsed.reason ?? null,
      "scrapped"
    );
    await logInventoryAudit("equipment_item.scrapped", "equipment_items", id, {
      toWarehouseLocationId: parsed.toWarehouseLocationId,
      reason: parsed.reason,
    });
    return movement;
  } catch (error) {
    throw toInventoryError(error, "Equipment item");
  }
}

// --- Module 4 (Planning)-triggered lifecycle changes ---------------------------------------
// Same EquipmentLifecycleService boundary as everything else in this file — Planning never
// writes equipment_items directly, it calls these three methods. Status-only, no location
// change (mirrors 'transfer's same-location no-op pattern) — see
// supabase/migrations/0054_planning_lifecycle_functions.sql.

async function reserveEquipmentItem(id: string): Promise<EquipmentItemMovementRow> {
  await assertAnyPermission(["planning.prepare", "planning.manage"]);
  const item = await requireItem(id);

  assertEquipmentStatusTransition(item.current_status, "reserved", (m) => new ConflictError(m));

  try {
    const movement = await equipmentItemRepository.reserveViaTransaction(id);
    await logInventoryAudit("equipment_item.reserved", "equipment_items", id, {});
    return movement;
  } catch (error) {
    throw toInventoryError(error, "Equipment item");
  }
}

async function releaseReservedEquipmentItem(id: string): Promise<EquipmentItemMovementRow> {
  await assertAnyPermission(["planning.cancel", "planning.manage"]);
  const item = await requireItem(id);

  assertEquipmentStatusTransition(item.current_status, "available", (m) => new ConflictError(m));

  try {
    const movement = await equipmentItemRepository.releaseReservationViaTransaction(id);
    await logInventoryAudit("equipment_item.reservation_released", "equipment_items", id, {});
    return movement;
  } catch (error) {
    throw toInventoryError(error, "Equipment item");
  }
}

async function returnEquipmentItem(id: string): Promise<EquipmentItemMovementRow> {
  await assertAnyPermission(["planning.complete", "planning.manage"]);
  const item = await requireItem(id);

  assertEquipmentStatusTransition(item.current_status, "returned", (m) => new ConflictError(m));

  try {
    const movement = await equipmentItemRepository.returnViaTransaction(id);
    await logInventoryAudit("equipment_item.returned", "equipment_items", id, {});
    return movement;
  } catch (error) {
    throw toInventoryError(error, "Equipment item");
  }
}

async function bulkMoveEquipmentItems(
  input: BulkWarehouseMoveInput
): Promise<EquipmentItemMovementRow[]> {
  await assertAnyPermission(["warehouse.bulk.move", "warehouse.manage"]);
  const parsed = bulkWarehouseMoveSchema.parse(input);

  try {
    const movements = await equipmentItemRepository.recordBulkMoveViaTransaction(
      parsed.itemIds,
      parsed.toWarehouseLocationId,
      parsed.reason ?? null
    );
    await logInventoryAudit("equipment_item.bulk_moved", "equipment_items", null, {
      itemIds: parsed.itemIds,
      toWarehouseLocationId: parsed.toWarehouseLocationId,
    });
    return movements;
  } catch (error) {
    throw toInventoryError(error, "Equipment item");
  }
}

export const equipmentItemService = {
  createEquipmentItem,
  updateEquipmentItem,
  archiveEquipmentItem,
  transferEquipmentItem,
  checkOutEquipmentItem,
  checkInEquipmentItem,
  putAwayEquipmentItem,
  pickEquipmentItem,
  quarantineEquipmentItem,
  releaseFromQuarantineEquipmentItem,
  scrapEquipmentItem,
  bulkMoveEquipmentItems,
  reserveEquipmentItem,
  releaseReservedEquipmentItem,
  returnEquipmentItem,
};
