"use server";

import { revalidatePath } from "next/cache";
import { runAction } from "@/modules/fleet/shared/run-action";
import type { ActionResult } from "@/modules/warehouse/types/action-result";
import { vehicleService } from "@/modules/fleet/services/vehicle-service";
import type { UpdateVehicleFleetInfoInput } from "@/modules/fleet/schemas/vehicle-schema";
import type { CreateMaintenanceRecordInput } from "@/modules/fleet/schemas/maintenance-record-schema";
import type { CreateFuelLogInput } from "@/modules/fleet/schemas/fuel-log-schema";
import type { VehicleRow } from "@/modules/fleet/repositories/vehicle-repository";
import type { MaintenanceRecordRow } from "@/modules/fleet/repositories/maintenance-record-repository";
import type { FuelLogRow } from "@/modules/fleet/repositories/fuel-log-repository";

function revalidateFleet(id?: string) {
  revalidatePath("/fleet");
  if (id) revalidatePath(`/fleet/${id}`);
}

export async function getVehicleAction(id: string): Promise<
  ActionResult<{
    vehicle: VehicleRow;
    maintenanceRecords: MaintenanceRecordRow[];
    fuelLogs: FuelLogRow[];
  }>
> {
  return runAction(() => vehicleService.getVehicle(id));
}

export async function listVehiclesAction(): Promise<ActionResult<VehicleRow[]>> {
  return runAction(() => vehicleService.listVehicles());
}

export async function updateVehicleFleetInfoAction(
  id: string,
  input: UpdateVehicleFleetInfoInput
): Promise<ActionResult<VehicleRow>> {
  const result = await runAction(() => vehicleService.updateVehicleFleetInfo(id, input));
  revalidateFleet(id);
  return result;
}

export async function addMaintenanceRecordAction(
  vehicleId: string,
  input: CreateMaintenanceRecordInput
): Promise<ActionResult<MaintenanceRecordRow>> {
  const result = await runAction(() => vehicleService.addMaintenanceRecord(vehicleId, input));
  revalidateFleet(vehicleId);
  return result;
}

export async function addFuelLogAction(
  vehicleId: string,
  input: CreateFuelLogInput
): Promise<ActionResult<FuelLogRow>> {
  const result = await runAction(() => vehicleService.addFuelLog(vehicleId, input));
  revalidateFleet(vehicleId);
  return result;
}
