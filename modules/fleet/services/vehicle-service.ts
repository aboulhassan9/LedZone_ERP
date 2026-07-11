import "server-only";
import { assertPermission } from "@/modules/fleet/shared/authorize";
import { logFleetAudit } from "@/modules/fleet/shared/audit";
import { NotFoundError, toFleetError } from "@/modules/fleet/errors";
import {
  updateVehicleFleetInfoSchema,
  type UpdateVehicleFleetInfoInput,
} from "@/modules/fleet/schemas/vehicle-schema";
import { vehicleRepository, type VehicleRow } from "@/modules/fleet/repositories/vehicle-repository";
import {
  createMaintenanceRecordSchema,
  type CreateMaintenanceRecordInput,
} from "@/modules/fleet/schemas/maintenance-record-schema";
import {
  maintenanceRecordRepository,
  type MaintenanceRecordRow,
} from "@/modules/fleet/repositories/maintenance-record-repository";
import { createFuelLogSchema, type CreateFuelLogInput } from "@/modules/fleet/schemas/fuel-log-schema";
import { fuelLogRepository, type FuelLogRow } from "@/modules/fleet/repositories/fuel-log-repository";

async function requireVehicle(id: string): Promise<VehicleRow> {
  const vehicle = await vehicleRepository.findById(id);
  if (!vehicle) throw new NotFoundError("Vehicle");
  return vehicle;
}

async function getVehicle(
  id: string
): Promise<{ vehicle: VehicleRow; maintenanceRecords: MaintenanceRecordRow[]; fuelLogs: FuelLogRow[] }> {
  await assertPermission("fleet.view");
  const vehicle = await requireVehicle(id);
  const [maintenanceRecords, fuelLogs] = await Promise.all([
    maintenanceRecordRepository.findByVehicle(id),
    fuelLogRepository.findByVehicle(id),
  ]);
  return { vehicle, maintenanceRecords, fuelLogs };
}

async function listVehicles(): Promise<VehicleRow[]> {
  await assertPermission("fleet.view");
  return vehicleRepository.list();
}

async function updateVehicleFleetInfo(
  id: string,
  input: UpdateVehicleFleetInfoInput
): Promise<VehicleRow> {
  const userId = await assertPermission("fleet.manage");
  const parsed = updateVehicleFleetInfoSchema.parse(input);
  await requireVehicle(id);

  try {
    const vehicle = await vehicleRepository.updateFleetInfo(id, parsed, userId);
    await logFleetAudit("vehicle.fleet_info_updated", "vehicles", id, parsed);
    return vehicle;
  } catch (error) {
    throw toFleetError(error, "Vehicle");
  }
}

async function addMaintenanceRecord(
  vehicleId: string,
  input: CreateMaintenanceRecordInput
): Promise<MaintenanceRecordRow> {
  const userId = await assertPermission("fleet.manage");
  const parsed = createMaintenanceRecordSchema.parse(input);
  await requireVehicle(vehicleId);

  try {
    const record = await maintenanceRecordRepository.create(vehicleId, parsed, userId);
    await logFleetAudit("vehicle_maintenance_record.added", "vehicle_maintenance_records", record.id, {
      vehicleId,
      maintenanceType: parsed.maintenanceType,
    });
    return record;
  } catch (error) {
    throw toFleetError(error, "Maintenance record");
  }
}

async function addFuelLog(vehicleId: string, input: CreateFuelLogInput): Promise<FuelLogRow> {
  const userId = await assertPermission("fleet.manage");
  const parsed = createFuelLogSchema.parse(input);
  await requireVehicle(vehicleId);

  try {
    const log = await fuelLogRepository.create(vehicleId, parsed, userId);
    await logFleetAudit("vehicle_fuel_log.added", "vehicle_fuel_logs", log.id, {
      vehicleId,
      liters: parsed.liters,
    });
    return log;
  } catch (error) {
    throw toFleetError(error, "Fuel log");
  }
}

export const vehicleService = {
  getVehicle,
  listVehicles,
  updateVehicleFleetInfo,
  addMaintenanceRecord,
  addFuelLog,
};
