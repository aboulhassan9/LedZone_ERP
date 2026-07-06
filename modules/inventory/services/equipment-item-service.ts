import "server-only";
import { assertPermission, assertAnyPermission } from "@/modules/inventory/shared/authorize";
import { logInventoryAudit } from "@/modules/inventory/shared/audit";
import { ConflictError, NotFoundError, toInventoryError } from "@/modules/inventory/errors";
import {
  createEquipmentItemSchema,
  updateEquipmentItemSchema,
  transferEquipmentItemSchema,
  checkOutEquipmentItemSchema,
  checkInEquipmentItemSchema,
  type CreateEquipmentItemInput,
  type UpdateEquipmentItemInput,
  type TransferEquipmentItemInput,
  type CheckOutEquipmentItemInput,
  type CheckInEquipmentItemInput,
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
  const userId = await assertPermission("inventory.manage");
  const item = await requireItem(id);

  if (item.current_status === "in_use" || item.current_status === "reserved") {
    throw new ConflictError(
      `Cannot archive an item that is currently ${item.current_status}. Check it in first.`
    );
  }

  await equipmentItemRepository.archive(id, userId);
  await logInventoryAudit("equipment_item.archived", "equipment_items", id);
}

async function transferEquipmentItem(
  id: string,
  input: TransferEquipmentItemInput
): Promise<EquipmentItemMovementRow> {
  await assertAnyPermission(["inventory.transfer", "inventory.manage"]);
  const parsed = transferEquipmentItemSchema.parse(input);
  const item = await requireItem(id);

  if (item.current_status === "retired" || item.current_status === "lost") {
    throw new ConflictError(`Cannot transfer an item with status "${item.current_status}".`);
  }

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

export const equipmentItemService = {
  createEquipmentItem,
  updateEquipmentItem,
  archiveEquipmentItem,
  transferEquipmentItem,
  checkOutEquipmentItem,
  checkInEquipmentItem,
};
