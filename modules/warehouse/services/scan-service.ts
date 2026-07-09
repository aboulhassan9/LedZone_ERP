import "server-only";
import { assertAnyPermission } from "@/modules/warehouse/shared/authorize";
import { ValidationError } from "@/modules/warehouse/errors";
import { warehouseLocationCodeRepository } from "@/modules/warehouse/repositories/warehouse-location-code-repository";
import { warehouseLocationRepository, type WarehouseLocationRow } from "@/modules/warehouse/repositories/warehouse-location-repository";
import { equipmentItemRepository, type EquipmentItemRow } from "@/modules/inventory/repositories/equipment-item-repository";

export type ScanResult =
  | { type: "location"; location: WarehouseLocationRow }
  | { type: "item"; item: EquipmentItemRow }
  | { type: "not_found" };

// A single entry point for "what does this scanned string mean" — a warehouse location's
// code_value is its full_code, an equipment item's is its asset_tag (see
// warehouse-location-code-service.ts / equipment-item-code-service.ts), and the two spaces
// don't overlap in practice, so trying location first then item is safe and cheap (two
// indexed lookups, no ambiguity to resolve). Read-only: warehouse.view is enough to scan and
// navigate; the narrower warehouse.qr.scan key is honored too for staff who only hold that.
async function resolveScan(codeValue: string): Promise<ScanResult> {
  await assertAnyPermission(["warehouse.manage", "warehouse.qr.scan", "warehouse.view"]);

  const trimmed = codeValue.trim();
  if (!trimmed) throw new ValidationError("Scanned value is empty.");

  const locationCode = await warehouseLocationCodeRepository.findByCodeValue(trimmed);
  if (locationCode) {
    const location = await warehouseLocationRepository.findById(locationCode.warehouse_location_id);
    if (location) return { type: "location", location };
  }

  const item = await equipmentItemRepository.findByAssetTag(trimmed);
  if (item) return { type: "item", item };

  return { type: "not_found" };
}

export const scanService = { resolveScan };
