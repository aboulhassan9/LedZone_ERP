import { z } from "zod";

export const createEquipmentModelSchema = z.object({
  categoryId: z.string().uuid("Select a category"),
  manufacturerId: z.string().uuid("Select a manufacturer"),
  brandId: z.string().uuid().optional(),
  modelName: z.string().min(1, "Model name is required").max(200),
  modelNumber: z.string().max(100).optional(),
  description: z.string().max(2000).optional(),
  trackingType: z.enum(["individual", "consumable"]).default("individual"),
  specifications: z.record(z.string(), z.unknown()).default({}),
  defaultWarrantyMonths: z.number().int().min(0).optional(),
  expectedLifespanMonths: z.number().int().min(0).optional(),
  imageUrl: z.string().url().optional(),
});
export type CreateEquipmentModelInput = z.infer<typeof createEquipmentModelSchema>;

export const updateEquipmentModelSchema = createEquipmentModelSchema.partial().extend({
  status: z.enum(["active", "inactive", "discontinued"]).optional(),
});
export type UpdateEquipmentModelInput = z.infer<typeof updateEquipmentModelSchema>;

// createConsumable() is createEquipmentModel() with trackingType forced to "consumable" —
// same catalog, same schema, just excludes the field the caller isn't allowed to set.
export const createConsumableSchema = createEquipmentModelSchema.omit({ trackingType: true });
export type CreateConsumableInput = z.infer<typeof createConsumableSchema>;
