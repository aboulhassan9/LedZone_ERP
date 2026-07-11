"use server";

import { revalidatePath } from "next/cache";
import { runAction } from "@/modules/warehouse/shared/run-action";
import type { ActionResult } from "@/modules/warehouse/types/action-result";
import { warehouseLocationService } from "@/modules/warehouse/services/warehouse-location-service";
import type {
  CreateWarehouseLocationInput,
  UpdateWarehouseLocationInput,
} from "@/modules/warehouse/schemas/warehouse-location-schema";
import {
  warehouseLocationRepository,
  type WarehouseLocationRow,
} from "@/modules/warehouse/repositories/warehouse-location-repository";

function revalidateLocations(warehouseId?: string) {
  revalidatePath("/warehouse/locations");
  if (warehouseId) revalidatePath(`/warehouse/warehouses/${warehouseId}`);
}

export async function createWarehouseLocationAction(
  input: CreateWarehouseLocationInput
): Promise<ActionResult<WarehouseLocationRow>> {
  const result = await runAction(() => warehouseLocationService.createLocation(input));
  if (result.success) revalidateLocations(result.data.warehouse_id);
  return result;
}

export async function updateWarehouseLocationAction(
  id: string,
  input: UpdateWarehouseLocationInput
): Promise<ActionResult<WarehouseLocationRow>> {
  const result = await runAction(() => warehouseLocationService.updateLocation(id, input));
  if (result.success) revalidateLocations(result.data.warehouse_id);
  return result;
}

export async function archiveWarehouseLocationAction(id: string): Promise<ActionResult<void>> {
  const result = await runAction(() => warehouseLocationService.archiveLocation(id));
  revalidateLocations();
  return result;
}

// Read-only "contents preview" for the Location Explorer — no mutation, so it's a thin
// repository read rather than a service-layer call (RLS on equipment_items/
// consumable_stock_levels already gates visibility).
export async function getLocationContentsAction(warehouseLocationId: string) {
  return warehouseLocationRepository.findContents(warehouseLocationId);
}

