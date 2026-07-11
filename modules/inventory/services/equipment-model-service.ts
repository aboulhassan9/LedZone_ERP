import "server-only";
import { assertPermission } from "@/modules/inventory/shared/authorize";
import { logInventoryAudit } from "@/modules/inventory/shared/audit";
import { NotFoundError, toInventoryError } from "@/modules/inventory/errors";
import {
  createEquipmentModelSchema,
  updateEquipmentModelSchema,
  createConsumableSchema,
  type CreateEquipmentModelInput,
  type UpdateEquipmentModelInput,
  type CreateConsumableInput,
} from "@/modules/inventory/schemas/equipment-model-schema";
import {
  equipmentModelRepository,
  type EquipmentModelRow,
} from "@/modules/inventory/repositories/equipment-model-repository";

async function createEquipmentModel(input: CreateEquipmentModelInput): Promise<EquipmentModelRow> {
  const userId = await assertPermission("inventory.manage");
  const parsed = createEquipmentModelSchema.parse(input);
  try {
    const model = await equipmentModelRepository.create(parsed, userId);
    await logInventoryAudit("equipment_model.created", "equipment_models", model.id, {
      modelName: parsed.modelName,
      trackingType: parsed.trackingType,
    });
    return model;
  } catch (error) {
    throw toInventoryError(error, "Equipment model");
  }
}

// Reuses createEquipmentModel — a consumable is just a model whose tracking_type is fixed
// to "consumable" so physical units go into consumable_stock_* instead of equipment_items.
// Same catalog, same table, one fork point.
async function createConsumable(input: CreateConsumableInput): Promise<EquipmentModelRow> {
  const parsed = createConsumableSchema.parse(input);
  return createEquipmentModel({ ...parsed, trackingType: "consumable" });
}

async function updateEquipmentModel(
  id: string,
  input: UpdateEquipmentModelInput
): Promise<EquipmentModelRow> {
  const userId = await assertPermission("inventory.manage");
  const parsed = updateEquipmentModelSchema.parse(input);
  const existing = await equipmentModelRepository.findById(id);
  if (!existing) throw new NotFoundError("Equipment model");
  try {
    const model = await equipmentModelRepository.update(id, parsed, userId);
    await logInventoryAudit("equipment_model.updated", "equipment_models", id, parsed);
    return model;
  } catch (error) {
    throw toInventoryError(error, "Equipment model");
  }
}

async function archiveEquipmentModel(id: string): Promise<void> {
  const userId = await assertPermission("inventory.manage");
  const existing = await equipmentModelRepository.findById(id);
  if (!existing) throw new NotFoundError("Equipment model");
  await equipmentModelRepository.archive(id, userId);
  await logInventoryAudit("equipment_model.archived", "equipment_models", id);
}

export const equipmentModelService = {
  createEquipmentModel,
  createConsumable,
  updateEquipmentModel,
  archiveEquipmentModel,
};
