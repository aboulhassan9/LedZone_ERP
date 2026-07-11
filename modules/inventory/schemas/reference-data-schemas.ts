import { z } from "zod";

export const createEquipmentCategorySchema = z.object({
  parentId: z.string().uuid().optional(),
  name: z.string().min(1, "Name is required").max(200),
  description: z.string().max(2000).optional(),
  icon: z.string().max(100).optional(),
});
export type CreateEquipmentCategoryInput = z.infer<typeof createEquipmentCategorySchema>;

export const updateEquipmentCategorySchema = createEquipmentCategorySchema.partial().extend({
  status: z.enum(["active", "inactive"]).optional(),
});
export type UpdateEquipmentCategoryInput = z.infer<typeof updateEquipmentCategorySchema>;

export const createManufacturerSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  country: z.string().max(100).optional(),
  website: z.string().url().max(300).optional().or(z.literal("")),
  supportEmail: z.string().email().optional().or(z.literal("")),
  supportPhone: z.string().max(50).optional(),
});
export type CreateManufacturerInput = z.infer<typeof createManufacturerSchema>;

export const updateManufacturerSchema = createManufacturerSchema.partial().extend({
  status: z.enum(["active", "inactive"]).optional(),
});
export type UpdateManufacturerInput = z.infer<typeof updateManufacturerSchema>;

export const createBrandSchema = z.object({
  manufacturerId: z.string().uuid().optional(),
  name: z.string().min(1, "Name is required").max(200),
  website: z.string().url().max(300).optional().or(z.literal("")),
});
export type CreateBrandInput = z.infer<typeof createBrandSchema>;

export const updateBrandSchema = createBrandSchema.partial().extend({
  status: z.enum(["active", "inactive"]).optional(),
});
export type UpdateBrandInput = z.infer<typeof updateBrandSchema>;

export const createSupplierSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  contactName: z.string().max(200).optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().max(50).optional(),
  address: z.string().max(500).optional(),
  country: z.string().max(100).optional(),
  preferredCurrency: z.string().length(3).optional(),
});
export type CreateSupplierInput = z.infer<typeof createSupplierSchema>;

export const updateSupplierSchema = createSupplierSchema.partial().extend({
  status: z.enum(["active", "inactive"]).optional(),
});
export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>;

export const createStorageLocationSchema = z.object({
  locationId: z.string().uuid("Select a location"),
  name: z.string().min(1, "Name is required").max(200),
  code: z.string().max(50).optional(),
});
export type CreateStorageLocationInput = z.infer<typeof createStorageLocationSchema>;

export const updateStorageLocationSchema = createStorageLocationSchema.partial().extend({
  status: z.enum(["active", "inactive"]).optional(),
});
export type UpdateStorageLocationInput = z.infer<typeof updateStorageLocationSchema>;
