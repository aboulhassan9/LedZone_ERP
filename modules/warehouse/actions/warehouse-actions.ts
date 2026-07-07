"use server";

import { revalidatePath } from "next/cache";
import { runAction } from "@/modules/warehouse/shared/run-action";
import type { ActionResult } from "@/modules/warehouse/types/action-result";
import { warehouseService } from "@/modules/warehouse/services/warehouse-service";
import type { CreateWarehouseInput, UpdateWarehouseInput } from "@/modules/warehouse/schemas/warehouse-schema";
import type { WarehouseRow } from "@/modules/warehouse/repositories/warehouse-repository";

function revalidateWarehouses() {
  revalidatePath("/warehouse");
  revalidatePath("/warehouse/warehouses");
}

export async function createWarehouseAction(
  input: CreateWarehouseInput
): Promise<ActionResult<WarehouseRow>> {
  const result = await runAction(() => warehouseService.createWarehouse(input));
  revalidateWarehouses();
  return result;
}

export async function updateWarehouseAction(
  id: string,
  input: UpdateWarehouseInput
): Promise<ActionResult<WarehouseRow>> {
  const result = await runAction(() => warehouseService.updateWarehouse(id, input));
  revalidateWarehouses();
  return result;
}

export async function archiveWarehouseAction(id: string): Promise<ActionResult<void>> {
  const result = await runAction(() => warehouseService.archiveWarehouse(id));
  revalidateWarehouses();
  return result;
}

export async function setDefaultWarehouseAction(id: string): Promise<ActionResult<WarehouseRow>> {
  const result = await runAction(() => warehouseService.setDefaultWarehouse(id));
  revalidateWarehouses();
  return result;
}
