import "server-only";
import { assertPermission } from "@/modules/inventory/shared/authorize";
import { logInventoryAudit } from "@/modules/inventory/shared/audit";
import { NotFoundError, toInventoryError } from "@/modules/inventory/errors";
import {
  createEquipmentCategorySchema,
  updateEquipmentCategorySchema,
  createManufacturerSchema,
  updateManufacturerSchema,
  createBrandSchema,
  updateBrandSchema,
  createSupplierSchema,
  updateSupplierSchema,
  createStorageLocationSchema,
  updateStorageLocationSchema,
  type CreateEquipmentCategoryInput,
  type UpdateEquipmentCategoryInput,
  type CreateManufacturerInput,
  type UpdateManufacturerInput,
  type CreateBrandInput,
  type UpdateBrandInput,
  type CreateSupplierInput,
  type UpdateSupplierInput,
  type CreateStorageLocationInput,
  type UpdateStorageLocationInput,
} from "@/modules/inventory/schemas/reference-data-schemas";
import { equipmentCategoryRepository, type EquipmentCategoryRow } from "@/modules/inventory/repositories/equipment-category-repository";
import { manufacturerRepository, type ManufacturerRow } from "@/modules/inventory/repositories/manufacturer-repository";
import { brandRepository, type BrandRow } from "@/modules/inventory/repositories/brand-repository";
import { supplierRepository, type SupplierRow } from "@/modules/inventory/repositories/supplier-repository";
import { storageLocationRepository, type StorageLocationRow } from "@/modules/inventory/repositories/storage-location-repository";

// All five reference-data entities (categories/manufacturers/brands/suppliers/storage
// locations) share one business-rule shape: inventory.manage to write, validate, persist,
// audit-log. Grouped in one file rather than five near-duplicates.

export const equipmentCategoryService = {
  async createEquipmentCategory(input: CreateEquipmentCategoryInput): Promise<EquipmentCategoryRow> {
    const userId = await assertPermission("inventory.manage");
    const parsed = createEquipmentCategorySchema.parse(input);
    try {
      const category = await equipmentCategoryRepository.create(parsed, userId);
      await logInventoryAudit("equipment_category.created", "equipment_categories", category.id, parsed);
      return category;
    } catch (error) {
      throw toInventoryError(error, "Equipment category");
    }
  },

  async updateEquipmentCategory(
    id: string,
    input: UpdateEquipmentCategoryInput
  ): Promise<EquipmentCategoryRow> {
    const userId = await assertPermission("inventory.manage");
    const parsed = updateEquipmentCategorySchema.parse(input);
    const existing = await equipmentCategoryRepository.findById(id);
    if (!existing) throw new NotFoundError("Equipment category");
    try {
      const category = await equipmentCategoryRepository.update(id, parsed, userId);
      await logInventoryAudit("equipment_category.updated", "equipment_categories", id, parsed);
      return category;
    } catch (error) {
      throw toInventoryError(error, "Equipment category");
    }
  },

  async archiveEquipmentCategory(id: string): Promise<void> {
    const userId = await assertPermission("inventory.manage");
    const existing = await equipmentCategoryRepository.findById(id);
    if (!existing) throw new NotFoundError("Equipment category");
    await equipmentCategoryRepository.archive(id, userId);
    await logInventoryAudit("equipment_category.archived", "equipment_categories", id);
  },
};

export const manufacturerService = {
  async createManufacturer(input: CreateManufacturerInput): Promise<ManufacturerRow> {
    const userId = await assertPermission("inventory.manage");
    const parsed = createManufacturerSchema.parse(input);
    try {
      const manufacturer = await manufacturerRepository.create(parsed, userId);
      await logInventoryAudit("manufacturer.created", "manufacturers", manufacturer.id, parsed);
      return manufacturer;
    } catch (error) {
      throw toInventoryError(error, "Manufacturer");
    }
  },

  async updateManufacturer(id: string, input: UpdateManufacturerInput): Promise<ManufacturerRow> {
    const userId = await assertPermission("inventory.manage");
    const parsed = updateManufacturerSchema.parse(input);
    const existing = await manufacturerRepository.findById(id);
    if (!existing) throw new NotFoundError("Manufacturer");
    try {
      const manufacturer = await manufacturerRepository.update(id, parsed, userId);
      await logInventoryAudit("manufacturer.updated", "manufacturers", id, parsed);
      return manufacturer;
    } catch (error) {
      throw toInventoryError(error, "Manufacturer");
    }
  },

  async archiveManufacturer(id: string): Promise<void> {
    const userId = await assertPermission("inventory.manage");
    const existing = await manufacturerRepository.findById(id);
    if (!existing) throw new NotFoundError("Manufacturer");
    await manufacturerRepository.archive(id, userId);
    await logInventoryAudit("manufacturer.archived", "manufacturers", id);
  },
};

export const brandService = {
  async createBrand(input: CreateBrandInput): Promise<BrandRow> {
    const userId = await assertPermission("inventory.manage");
    const parsed = createBrandSchema.parse(input);
    try {
      const brand = await brandRepository.create(parsed, userId);
      await logInventoryAudit("brand.created", "brands", brand.id, parsed);
      return brand;
    } catch (error) {
      throw toInventoryError(error, "Brand");
    }
  },

  async updateBrand(id: string, input: UpdateBrandInput): Promise<BrandRow> {
    const userId = await assertPermission("inventory.manage");
    const parsed = updateBrandSchema.parse(input);
    const existing = await brandRepository.findById(id);
    if (!existing) throw new NotFoundError("Brand");
    try {
      const brand = await brandRepository.update(id, parsed, userId);
      await logInventoryAudit("brand.updated", "brands", id, parsed);
      return brand;
    } catch (error) {
      throw toInventoryError(error, "Brand");
    }
  },

  async archiveBrand(id: string): Promise<void> {
    const userId = await assertPermission("inventory.manage");
    const existing = await brandRepository.findById(id);
    if (!existing) throw new NotFoundError("Brand");
    await brandRepository.archive(id, userId);
    await logInventoryAudit("brand.archived", "brands", id);
  },
};

export const supplierService = {
  async createSupplier(input: CreateSupplierInput): Promise<SupplierRow> {
    const userId = await assertPermission("inventory.manage");
    const parsed = createSupplierSchema.parse(input);
    try {
      const supplier = await supplierRepository.create(parsed, userId);
      await logInventoryAudit("supplier.created", "suppliers", supplier.id, parsed);
      return supplier;
    } catch (error) {
      throw toInventoryError(error, "Supplier");
    }
  },

  async updateSupplier(id: string, input: UpdateSupplierInput): Promise<SupplierRow> {
    const userId = await assertPermission("inventory.manage");
    const parsed = updateSupplierSchema.parse(input);
    const existing = await supplierRepository.findById(id);
    if (!existing) throw new NotFoundError("Supplier");
    try {
      const supplier = await supplierRepository.update(id, parsed, userId);
      await logInventoryAudit("supplier.updated", "suppliers", id, parsed);
      return supplier;
    } catch (error) {
      throw toInventoryError(error, "Supplier");
    }
  },

  async archiveSupplier(id: string): Promise<void> {
    const userId = await assertPermission("inventory.manage");
    const existing = await supplierRepository.findById(id);
    if (!existing) throw new NotFoundError("Supplier");
    await supplierRepository.archive(id, userId);
    await logInventoryAudit("supplier.archived", "suppliers", id);
  },
};

export const storageLocationService = {
  async createStorageLocation(input: CreateStorageLocationInput): Promise<StorageLocationRow> {
    const userId = await assertPermission("inventory.manage");
    const parsed = createStorageLocationSchema.parse(input);
    try {
      const location = await storageLocationRepository.create(parsed, userId);
      await logInventoryAudit("storage_location.created", "storage_locations", location.id, parsed);
      return location;
    } catch (error) {
      throw toInventoryError(error, "Storage location");
    }
  },

  async updateStorageLocation(
    id: string,
    input: UpdateStorageLocationInput
  ): Promise<StorageLocationRow> {
    const userId = await assertPermission("inventory.manage");
    const parsed = updateStorageLocationSchema.parse(input);
    const existing = await storageLocationRepository.findById(id);
    if (!existing) throw new NotFoundError("Storage location");
    try {
      const location = await storageLocationRepository.update(id, parsed, userId);
      await logInventoryAudit("storage_location.updated", "storage_locations", id, parsed);
      return location;
    } catch (error) {
      throw toInventoryError(error, "Storage location");
    }
  },

  async archiveStorageLocation(id: string): Promise<void> {
    const userId = await assertPermission("inventory.manage");
    const existing = await storageLocationRepository.findById(id);
    if (!existing) throw new NotFoundError("Storage location");
    await storageLocationRepository.archive(id, userId);
    await logInventoryAudit("storage_location.archived", "storage_locations", id);
  },
};
