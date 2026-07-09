"use server";

import { revalidatePath } from "next/cache";
import { runAction } from "@/modules/warehouse/shared/run-action";
import type { ActionResult } from "@/modules/warehouse/types/action-result";
import { warehouseLocationCodeService } from "@/modules/warehouse/services/warehouse-location-code-service";
import type { WarehouseLocationCodeRow } from "@/modules/warehouse/repositories/warehouse-location-code-repository";

function revalidateLocations() {
  revalidatePath("/warehouse/locations");
}

export async function assignLocationQrCodeAction(
  locationId: string
): Promise<ActionResult<WarehouseLocationCodeRow>> {
  const result = await runAction(() => warehouseLocationCodeService.assignQRCode(locationId));
  revalidateLocations();
  return result;
}

export async function assignLocationBarcodeAction(
  locationId: string
): Promise<ActionResult<WarehouseLocationCodeRow>> {
  const result = await runAction(() => warehouseLocationCodeService.assignBarcode(locationId));
  revalidateLocations();
  return result;
}

export async function listActiveLocationCodesAction(
  locationId: string
): Promise<ActionResult<WarehouseLocationCodeRow[]>> {
  return runAction(() => warehouseLocationCodeService.listActiveCodes(locationId));
}
