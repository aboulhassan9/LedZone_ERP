import "server-only";
import { assertAnyPermission, hasPermission } from "@/modules/warehouse/shared/authorize";
import { logWarehouseAudit } from "@/modules/warehouse/shared/audit";
import { getCurrentUser } from "@/lib/auth/permissions";
import {
  ConflictError,
  LocationNotFoundError,
  NotFoundError,
  ValidationError,
  toWarehouseError,
} from "@/modules/warehouse/errors";
import {
  createWarehouseLocationSchema,
  updateWarehouseLocationSchema,
  type CreateWarehouseLocationInput,
  type UpdateWarehouseLocationInput,
} from "@/modules/warehouse/schemas/warehouse-location-schema";
import {
  warehouseLocationRepository,
  type WarehouseLocationRow,
} from "@/modules/warehouse/repositories/warehouse-location-repository";
import { warehouseRepository } from "@/modules/warehouse/repositories/warehouse-repository";

// Zone -> Row -> Rack -> Shelf -> Bin is the canonical chain from the spec. The special
// area types (staging/loading/repair/quarantine/dock/charging) are alternate top-level
// areas, siblings of zone, not nested further — they're already addressable (is_placeable),
// so there's no reason to force sub-hierarchy under them. `null` means "must be top-level";
// an array lists the only node_types a parent may have.
const ALLOWED_PARENT_TYPES: Record<string, string[] | null> = {
  zone: null,
  staging_area: null,
  loading_zone: null,
  repair_zone: null,
  quarantine_area: null,
  dock: null,
  charging_station: null,
  row: ["zone"],
  rack: ["row"],
  shelf: ["rack"],
  bin: ["shelf"],
};

function assertValidParentChild(nodeType: string, parentNodeType: string | null): void {
  const allowed = ALLOWED_PARENT_TYPES[nodeType];

  if (allowed === null) {
    if (parentNodeType != null) {
      throw new ValidationError(`A "${nodeType}" location must be top-level (no parent).`);
    }
    return;
  }

  if (parentNodeType == null || !allowed.includes(parentNodeType)) {
    throw new ValidationError(
      `A "${nodeType}" location must be a child of one of: ${allowed.join(", ")}.`
    );
  }
}

async function requireLocation(id: string): Promise<WarehouseLocationRow> {
  const location = await warehouseLocationRepository.findById(id);
  if (!location) throw new NotFoundError("Warehouse location");
  return location;
}

async function createLocation(input: CreateWarehouseLocationInput): Promise<WarehouseLocationRow> {
  const userId = await assertAnyPermission([
    "warehouse.manage",
    "warehouse.location.manage",
    "warehouse.bin.manage",
  ]);
  const parsed = createWarehouseLocationSchema.parse(input);

  let parentNodeType: string | null = null;
  if (parsed.parentId) {
    const parent = await warehouseLocationRepository.findById(parsed.parentId);
    if (!parent) throw new LocationNotFoundError("Parent location not found.");
    if (parent.warehouse_id !== parsed.warehouseId) {
      throw new ValidationError("Parent location must belong to the same warehouse.");
    }
    parentNodeType = parent.node_type;
  }
  assertValidParentChild(parsed.nodeType, parentNodeType);

  try {
    const location = await warehouseLocationRepository.create(parsed, userId);
    await logWarehouseAudit("warehouse_location.created", "warehouse_locations", location.id, {
      warehouseId: parsed.warehouseId,
      nodeType: parsed.nodeType,
      fullCode: location.full_code,
    });
    return location;
  } catch (error) {
    throw toWarehouseError(error, "Warehouse location");
  }
}

async function updateLocation(
  id: string,
  input: UpdateWarehouseLocationInput
): Promise<WarehouseLocationRow> {
  const userId = await assertAnyPermission([
    "warehouse.manage",
    "warehouse.location.manage",
    "warehouse.bin.manage",
  ]);
  const parsed = updateWarehouseLocationSchema.parse(input);
  await requireLocation(id);

  try {
    const location = await warehouseLocationRepository.update(id, parsed, userId);
    await logWarehouseAudit("warehouse_location.updated", "warehouse_locations", id, parsed);
    return location;
  } catch (error) {
    throw toWarehouseError(error, "Warehouse location");
  }
}

async function archiveLocation(id: string): Promise<void> {
  const userId = await assertAnyPermission([
    "warehouse.manage",
    "warehouse.location.manage",
    "warehouse.bin.manage",
  ]);
  const location = await requireLocation(id);

  const occupancy = await warehouseLocationRepository.findOccupancy(id);
  if (occupancy && occupancy.occupied_units > 0) {
    throw new ConflictError(
      `Cannot archive "${location.full_code}" — it still has ${occupancy.occupied_units} unit(s) placed in it.`
    );
  }

  await warehouseLocationRepository.archive(id, userId);
  await logWarehouseAudit("warehouse_location.archived", "warehouse_locations", id);
}

// Business rule: "Capacity cannot be exceeded unless overridden by permission" —
// warehouse.manage is the override. Read-only helper other services call before placing
// units into a location.
async function assertCapacity(warehouseLocationId: string, additionalUnits: number): Promise<void> {
  const location = await requireLocation(warehouseLocationId);
  if (location.capacity_units == null) return; // unlimited

  const occupancy = await warehouseLocationRepository.findOccupancy(warehouseLocationId);
  const projected = (occupancy?.occupied_units ?? 0) + additionalUnits;

  if (projected > location.capacity_units) {
    if (await hasPermission("warehouse.manage")) return; // explicit override
    throw new ConflictError(
      `"${location.full_code}" capacity would be exceeded (${projected}/${location.capacity_units} units).`
    );
  }
}

// Resolves (or auto-provisions) the storage_locations bridge row Module 3.1 deliberately
// left to this layer, so every other Warehouse service can address equipment/consumables
// through this one location-service method instead of duplicating the fallback logic.
async function ensureStorageLocationBridge(warehouseLocationId: string): Promise<string> {
  const existing = await warehouseLocationRepository.findBridgedStorageLocationId(warehouseLocationId);
  if (existing) return existing;

  const user = await getCurrentUser();
  if (!user) throw new ValidationError("You must be signed in.");

  const location = await requireLocation(warehouseLocationId);
  if (!location.is_placeable) {
    throw new ValidationError(
      `"${location.full_code}" is a "${location.node_type}" container, not an addressable location.`
    );
  }

  const warehouse = await warehouseRepository.findById(location.warehouse_id);
  if (!warehouse) throw new NotFoundError("Warehouse");
  if (!warehouse.location_id) {
    throw new ConflictError(
      `Warehouse "${warehouse.name}" has no site (locations) assigned yet — set one before placing equipment there.`
    );
  }

  return warehouseLocationRepository.createStorageLocationBridge(
    warehouseLocationId,
    warehouse.location_id,
    location.name ?? location.full_code ?? location.code,
    location.full_code ?? location.code,
    user.id
  );
}

export const warehouseLocationService = {
  createLocation,
  updateLocation,
  archiveLocation,
  assertCapacity,
  ensureStorageLocationBridge,
};
