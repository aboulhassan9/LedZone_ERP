import "server-only";
import { assertAnyPermission } from "@/modules/warehouse/shared/authorize";
import { logWarehouseAudit } from "@/modules/warehouse/shared/audit";
import { NotFoundError, ValidationError, toWarehouseError } from "@/modules/warehouse/errors";
import {
  warehouseLocationCodeRepository,
  type WarehouseLocationCodeRow,
} from "@/modules/warehouse/repositories/warehouse-location-code-repository";
import { warehouseLocationRepository } from "@/modules/warehouse/repositories/warehouse-location-repository";
import { generateAndStoreQrCode } from "@/lib/services/qr-generator";
import { generateAndStoreBarcode } from "@/lib/services/barcode-generator";

// Both codes encode the location's own full_code (its human-readable identity, e.g.
// "A-03-R12-S2-B04") — mirrors equipment-item-code-service.ts encoding the item's asset_tag.
// Only placeable nodes (bin/staging_area/...) get labels; a Zone/Row/Rack/Shelf is a
// container, never scanned as a destination.

async function requirePlaceableLocation(locationId: string) {
  const location = await warehouseLocationRepository.findById(locationId);
  if (!location) throw new NotFoundError("Warehouse location");
  if (!location.is_placeable) {
    throw new ValidationError("Only placeable locations (bins, staging areas, ...) can have QR/barcode labels.");
  }
  if (!location.full_code) {
    throw new ValidationError("This location has no full_code yet — it cannot be labeled.");
  }
  return location;
}

async function assignQRCode(locationId: string): Promise<WarehouseLocationCodeRow> {
  await assertAnyPermission(["warehouse.manage", "warehouse.qr.generate"]);
  const location = await requirePlaceableLocation(locationId);

  try {
    const imageUrl = await generateAndStoreQrCode(location.full_code!, `warehouse-labels/${location.full_code}.png`);
    const code = await warehouseLocationCodeRepository.assignViaTransaction(locationId, "qr", location.full_code!, imageUrl);
    await logWarehouseAudit("warehouse_location.qr_assigned", "warehouse_locations", locationId, {
      codeId: code.id,
    });
    return code;
  } catch (error) {
    throw toWarehouseError(error, "QR code");
  }
}

async function assignBarcode(locationId: string): Promise<WarehouseLocationCodeRow> {
  await assertAnyPermission(["warehouse.manage", "warehouse.qr.generate"]);
  const location = await requirePlaceableLocation(locationId);

  try {
    const imageUrl = await generateAndStoreBarcode(location.full_code!, `warehouse-labels/${location.full_code}.png`);
    const code = await warehouseLocationCodeRepository.assignViaTransaction(locationId, "barcode", location.full_code!, imageUrl);
    await logWarehouseAudit("warehouse_location.barcode_assigned", "warehouse_locations", locationId, {
      codeId: code.id,
    });
    return code;
  } catch (error) {
    throw toWarehouseError(error, "Barcode");
  }
}

async function listActiveCodes(locationId: string): Promise<WarehouseLocationCodeRow[]> {
  await assertAnyPermission(["warehouse.manage", "warehouse.view"]);
  return warehouseLocationCodeRepository.findActiveForLocation(locationId);
}

async function listActiveCodesForLocations(locationIds: string[]): Promise<WarehouseLocationCodeRow[]> {
  await assertAnyPermission(["warehouse.manage", "warehouse.view"]);
  return warehouseLocationCodeRepository.findActiveForLocations(locationIds);
}

export const warehouseLocationCodeService = {
  assignQRCode,
  assignBarcode,
  listActiveCodes,
  listActiveCodesForLocations,
};
