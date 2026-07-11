import "server-only";
import { assertAnyPermission, assertPermission } from "@/modules/warehouse/shared/authorize";
import { logWarehouseAudit } from "@/modules/warehouse/shared/audit";
import { ConflictError, NotFoundError, toWarehouseError } from "@/modules/warehouse/errors";
import {
  createWarehouseSchema,
  updateWarehouseSchema,
  type CreateWarehouseInput,
  type UpdateWarehouseInput,
} from "@/modules/warehouse/schemas/warehouse-schema";
import { warehouseRepository, type WarehouseRow } from "@/modules/warehouse/repositories/warehouse-repository";

async function requireWarehouse(id: string): Promise<WarehouseRow> {
  const warehouse = await warehouseRepository.findById(id);
  if (!warehouse) throw new NotFoundError("Warehouse");
  return warehouse;
}

async function createWarehouse(input: CreateWarehouseInput): Promise<WarehouseRow> {
  const userId = await assertAnyPermission(["warehouse.manage", "warehouse.create"]);
  const parsed = createWarehouseSchema.parse(input);

  try {
    // Create as non-default first — becoming default is a separate atomic clear-then-set
    // step (setDefaultWarehouse), avoiding a race against the partial unique index on
    // warehouses.is_default.
    const warehouse = await warehouseRepository.create({ ...parsed, isDefault: false }, userId);
    await logWarehouseAudit("warehouse.created", "warehouses", warehouse.id, {
      name: warehouse.name,
      code: warehouse.code,
      warehouseType: warehouse.warehouse_type,
    });

    if (parsed.isDefault) {
      return await warehouseRepository.setDefault(warehouse.id, userId);
    }
    return warehouse;
  } catch (error) {
    throw toWarehouseError(error, "Warehouse");
  }
}

async function updateWarehouse(id: string, input: UpdateWarehouseInput): Promise<WarehouseRow> {
  const userId = await assertAnyPermission(["warehouse.manage", "warehouse.update"]);
  const parsed = updateWarehouseSchema.parse(input);
  await requireWarehouse(id);

  try {
    const warehouse = await warehouseRepository.update(id, parsed, userId);
    await logWarehouseAudit("warehouse.updated", "warehouses", id, parsed);

    if (parsed.isDefault) {
      return await warehouseRepository.setDefault(id, userId);
    }
    return warehouse;
  } catch (error) {
    throw toWarehouseError(error, "Warehouse");
  }
}

async function archiveWarehouse(id: string): Promise<void> {
  const userId = await assertAnyPermission(["warehouse.manage", "warehouse.delete"]);
  const warehouse = await requireWarehouse(id);

  if (warehouse.is_default) {
    throw new ConflictError("Cannot archive the default warehouse — set another warehouse as default first.");
  }

  await warehouseRepository.archive(id, userId);
  await logWarehouseAudit("warehouse.archived", "warehouses", id);
}

async function setDefaultWarehouse(id: string): Promise<WarehouseRow> {
  const userId = await assertPermission("warehouse.manage");
  const warehouse = await requireWarehouse(id);

  if (!warehouse.is_active || warehouse.status !== "active") {
    throw new ConflictError("Cannot set an inactive warehouse as the default.");
  }

  const updated = await warehouseRepository.setDefault(id, userId);
  await logWarehouseAudit("warehouse.default_set", "warehouses", id);
  return updated;
}

export const warehouseService = {
  createWarehouse,
  updateWarehouse,
  archiveWarehouse,
  setDefaultWarehouse,
};
