import "server-only";
import { assertPermission } from "@/modules/inventory/shared/authorize";
import { logInventoryAudit } from "@/modules/inventory/shared/audit";
import { NotFoundError, toInventoryError } from "@/modules/inventory/errors";
import { equipmentItemRepository } from "@/modules/inventory/repositories/equipment-item-repository";
import {
  equipmentItemCodeRepository,
  type EquipmentItemCodeRow,
} from "@/modules/inventory/repositories/equipment-item-code-repository";
import { generateAndStoreQrCode } from "@/lib/services/qr-generator";
import { generateAndStoreBarcode } from "@/lib/services/barcode-generator";

// Both codes encode the item's own asset_tag (its human-readable identity), never the
// model — a lookup by scanned value always resolves back to one physical unit.

async function assignQRCode(itemId: string): Promise<EquipmentItemCodeRow> {
  await assertPermission("inventory.manage");
  const item = await equipmentItemRepository.findById(itemId);
  if (!item) throw new NotFoundError("Equipment item");

  try {
    const imageUrl = await generateAndStoreQrCode(item.asset_tag, `items/${item.asset_tag}.png`);
    const code = await equipmentItemCodeRepository.assignViaTransaction(
      itemId,
      "qr",
      item.asset_tag,
      imageUrl
    );
    await logInventoryAudit("equipment_item.qr_assigned", "equipment_items", itemId, {
      codeId: code.id,
    });
    return code;
  } catch (error) {
    throw toInventoryError(error, "QR code");
  }
}

async function assignBarcode(itemId: string): Promise<EquipmentItemCodeRow> {
  await assertPermission("inventory.manage");
  const item = await equipmentItemRepository.findById(itemId);
  if (!item) throw new NotFoundError("Equipment item");

  try {
    const imageUrl = await generateAndStoreBarcode(item.asset_tag, `items/${item.asset_tag}.png`);
    const code = await equipmentItemCodeRepository.assignViaTransaction(
      itemId,
      "barcode",
      item.asset_tag,
      imageUrl
    );
    await logInventoryAudit("equipment_item.barcode_assigned", "equipment_items", itemId, {
      codeId: code.id,
    });
    return code;
  } catch (error) {
    throw toInventoryError(error, "Barcode");
  }
}

export const equipmentItemCodeService = { assignQRCode, assignBarcode };
