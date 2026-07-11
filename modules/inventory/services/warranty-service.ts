import "server-only";
import { assertPermission } from "@/modules/inventory/shared/authorize";
import { logInventoryAudit } from "@/modules/inventory/shared/audit";
import { NotFoundError, toInventoryError } from "@/modules/inventory/errors";
import {
  registerWarrantySchema,
  updateWarrantySchema,
  type RegisterWarrantyInput,
  type UpdateWarrantyInput,
} from "@/modules/inventory/schemas/warranty-schema";
import {
  warrantyRepository,
  type EquipmentItemWarrantyRow,
} from "@/modules/inventory/repositories/warranty-repository";

async function registerWarranty(input: RegisterWarrantyInput): Promise<EquipmentItemWarrantyRow> {
  const userId = await assertPermission("inventory.manage");
  const parsed = registerWarrantySchema.parse(input);
  try {
    const warranty = await warrantyRepository.create(parsed, userId);
    await logInventoryAudit("equipment_item.warranty_registered", "equipment_items", parsed.itemId, {
      warrantyId: warranty.id,
      providerType: parsed.providerType,
    });
    return warranty;
  } catch (error) {
    throw toInventoryError(error, "Warranty");
  }
}

async function updateWarranty(
  id: string,
  input: UpdateWarrantyInput
): Promise<EquipmentItemWarrantyRow> {
  const userId = await assertPermission("inventory.manage");
  const parsed = updateWarrantySchema.parse(input);
  const existing = await warrantyRepository.findById(id);
  if (!existing) throw new NotFoundError("Warranty");
  try {
    const warranty = await warrantyRepository.update(id, parsed, userId);
    await logInventoryAudit("equipment_item.warranty_updated", "equipment_items", existing.item_id, parsed);
    return warranty;
  } catch (error) {
    throw toInventoryError(error, "Warranty");
  }
}

export const warrantyService = { registerWarranty, updateWarranty };
