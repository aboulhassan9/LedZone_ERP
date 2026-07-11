import "server-only";
import { assertPermission } from "@/modules/inventory/shared/authorize";
import { logInventoryAudit } from "@/modules/inventory/shared/audit";
import { NotFoundError, toInventoryError } from "@/modules/inventory/errors";
import {
  setDepreciationPolicySchema,
  updateDepreciationPolicySchema,
  type SetDepreciationPolicyInput,
  type UpdateDepreciationPolicyInput,
} from "@/modules/inventory/schemas/depreciation-schema";
import {
  depreciationRepository,
  type EquipmentDepreciationPolicyRow,
} from "@/modules/inventory/repositories/depreciation-repository";

async function setDepreciationPolicy(
  input: SetDepreciationPolicyInput
): Promise<EquipmentDepreciationPolicyRow> {
  const userId = await assertPermission("inventory.manage");
  const parsed = setDepreciationPolicySchema.parse(input);
  try {
    const policy = await depreciationRepository.upsert(parsed, userId);
    await logInventoryAudit(
      "equipment_item.depreciation_policy_set",
      "equipment_items",
      parsed.itemId,
      { purchaseCost: parsed.purchaseCost, method: parsed.method }
    );
    return policy;
  } catch (error) {
    throw toInventoryError(error, "Depreciation policy");
  }
}

async function updateDepreciationPolicy(
  itemId: string,
  input: UpdateDepreciationPolicyInput
): Promise<EquipmentDepreciationPolicyRow> {
  const userId = await assertPermission("inventory.manage");
  const parsed = updateDepreciationPolicySchema.parse(input);
  const existing = await depreciationRepository.findByItemId(itemId);
  if (!existing) throw new NotFoundError("Depreciation policy");
  try {
    const policy = await depreciationRepository.update(itemId, parsed, userId);
    await logInventoryAudit(
      "equipment_item.depreciation_policy_updated",
      "equipment_items",
      itemId,
      parsed
    );
    return policy;
  } catch (error) {
    throw toInventoryError(error, "Depreciation policy");
  }
}

export const depreciationService = { setDepreciationPolicy, updateDepreciationPolicy };
