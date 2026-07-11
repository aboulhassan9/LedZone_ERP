import "server-only";
import { assertPermission } from "@/modules/inventory/shared/authorize";
import { logInventoryAudit } from "@/modules/inventory/shared/audit";
import { NotFoundError, toInventoryError } from "@/modules/inventory/errors";
import {
  registerPurchaseSchema,
  updatePurchaseSchema,
  type RegisterPurchaseInput,
  type UpdatePurchaseInput,
} from "@/modules/inventory/schemas/purchase-schema";
import {
  purchaseRepository,
  type EquipmentPurchaseRow,
} from "@/modules/inventory/repositories/purchase-repository";

async function registerPurchase(input: RegisterPurchaseInput): Promise<EquipmentPurchaseRow> {
  const userId = await assertPermission("inventory.manage");
  const parsed = registerPurchaseSchema.parse(input);
  try {
    const purchase = await purchaseRepository.create(parsed, userId);
    await logInventoryAudit("equipment_purchase.registered", "equipment_purchases", purchase.id, {
      supplierId: parsed.supplierId,
      totalAmount: parsed.totalAmount,
      currencyCode: parsed.currencyCode,
    });
    return purchase;
  } catch (error) {
    throw toInventoryError(error, "Purchase");
  }
}

async function updatePurchase(
  id: string,
  input: UpdatePurchaseInput
): Promise<EquipmentPurchaseRow> {
  const userId = await assertPermission("inventory.manage");
  const parsed = updatePurchaseSchema.parse(input);
  const existing = await purchaseRepository.findById(id);
  if (!existing) throw new NotFoundError("Purchase");
  try {
    const purchase = await purchaseRepository.update(id, parsed, userId);
    await logInventoryAudit("equipment_purchase.updated", "equipment_purchases", id, parsed);
    return purchase;
  } catch (error) {
    throw toInventoryError(error, "Purchase");
  }
}

export const purchaseService = { registerPurchase, updatePurchase };
