"use server";

import { revalidatePath } from "next/cache";
import { runAction } from "@/modules/inventory/shared/run-action";
import type { ActionResult } from "@/modules/inventory/types/action-result";
import {
  equipmentCategoryService,
  manufacturerService,
  brandService,
  supplierService,
  storageLocationService,
} from "@/modules/inventory/services/reference-data-service";
import type {
  CreateEquipmentCategoryInput,
  UpdateEquipmentCategoryInput,
  CreateManufacturerInput,
  UpdateManufacturerInput,
  CreateBrandInput,
  UpdateBrandInput,
  CreateSupplierInput,
  UpdateSupplierInput,
  CreateStorageLocationInput,
  UpdateStorageLocationInput,
} from "@/modules/inventory/schemas/reference-data-schemas";
import type { EquipmentCategoryRow } from "@/modules/inventory/repositories/equipment-category-repository";
import type { ManufacturerRow } from "@/modules/inventory/repositories/manufacturer-repository";
import type { BrandRow } from "@/modules/inventory/repositories/brand-repository";
import type { SupplierRow } from "@/modules/inventory/repositories/supplier-repository";
import type { StorageLocationRow } from "@/modules/inventory/repositories/storage-location-repository";

export async function createEquipmentCategoryAction(
  input: CreateEquipmentCategoryInput
): Promise<ActionResult<EquipmentCategoryRow>> {
  const result = await runAction(() => equipmentCategoryService.createEquipmentCategory(input));
  revalidatePath("/inventory/categories");
  return result;
}

export async function updateEquipmentCategoryAction(
  id: string,
  input: UpdateEquipmentCategoryInput
): Promise<ActionResult<EquipmentCategoryRow>> {
  const result = await runAction(() => equipmentCategoryService.updateEquipmentCategory(id, input));
  revalidatePath("/inventory/categories");
  return result;
}

export async function archiveEquipmentCategoryAction(id: string): Promise<ActionResult<void>> {
  const result = await runAction(() => equipmentCategoryService.archiveEquipmentCategory(id));
  revalidatePath("/inventory/categories");
  return result;
}

export async function createManufacturerAction(
  input: CreateManufacturerInput
): Promise<ActionResult<ManufacturerRow>> {
  const result = await runAction(() => manufacturerService.createManufacturer(input));
  revalidatePath("/inventory/manufacturers");
  return result;
}

export async function updateManufacturerAction(
  id: string,
  input: UpdateManufacturerInput
): Promise<ActionResult<ManufacturerRow>> {
  const result = await runAction(() => manufacturerService.updateManufacturer(id, input));
  revalidatePath("/inventory/manufacturers");
  return result;
}

export async function archiveManufacturerAction(id: string): Promise<ActionResult<void>> {
  const result = await runAction(() => manufacturerService.archiveManufacturer(id));
  revalidatePath("/inventory/manufacturers");
  return result;
}

export async function createBrandAction(input: CreateBrandInput): Promise<ActionResult<BrandRow>> {
  const result = await runAction(() => brandService.createBrand(input));
  revalidatePath("/inventory/brands");
  return result;
}

export async function updateBrandAction(
  id: string,
  input: UpdateBrandInput
): Promise<ActionResult<BrandRow>> {
  const result = await runAction(() => brandService.updateBrand(id, input));
  revalidatePath("/inventory/brands");
  return result;
}

export async function archiveBrandAction(id: string): Promise<ActionResult<void>> {
  const result = await runAction(() => brandService.archiveBrand(id));
  revalidatePath("/inventory/brands");
  return result;
}

export async function createSupplierAction(
  input: CreateSupplierInput
): Promise<ActionResult<SupplierRow>> {
  const result = await runAction(() => supplierService.createSupplier(input));
  revalidatePath("/inventory/suppliers");
  return result;
}

export async function updateSupplierAction(
  id: string,
  input: UpdateSupplierInput
): Promise<ActionResult<SupplierRow>> {
  const result = await runAction(() => supplierService.updateSupplier(id, input));
  revalidatePath("/inventory/suppliers");
  return result;
}

export async function archiveSupplierAction(id: string): Promise<ActionResult<void>> {
  const result = await runAction(() => supplierService.archiveSupplier(id));
  revalidatePath("/inventory/suppliers");
  return result;
}

export async function createStorageLocationAction(
  input: CreateStorageLocationInput
): Promise<ActionResult<StorageLocationRow>> {
  const result = await runAction(() => storageLocationService.createStorageLocation(input));
  revalidatePath("/inventory/storage-locations");
  return result;
}

export async function updateStorageLocationAction(
  id: string,
  input: UpdateStorageLocationInput
): Promise<ActionResult<StorageLocationRow>> {
  const result = await runAction(() => storageLocationService.updateStorageLocation(id, input));
  revalidatePath("/inventory/storage-locations");
  return result;
}

export async function archiveStorageLocationAction(id: string): Promise<ActionResult<void>> {
  const result = await runAction(() => storageLocationService.archiveStorageLocation(id));
  revalidatePath("/inventory/storage-locations");
  return result;
}
