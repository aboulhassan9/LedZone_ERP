import { z } from "zod";

export const WAREHOUSE_TYPES = [
  "main",
  "secondary",
  "event",
  "repair_center",
  "temporary",
  "mobile_truck",
] as const;

export const createWarehouseSchema = z.object({
  locationId: z.string().uuid().optional(),
  name: z.string().min(1, "Name is required").max(200),
  code: z.string().min(1, "Code is required").max(50),
  description: z.string().max(2000).optional(),
  warehouseType: z.enum(WAREHOUSE_TYPES).default("main"),
  address: z.string().max(500).optional(),
  gpsLat: z.number().min(-90).max(90).optional(),
  gpsLng: z.number().min(-180).max(180).optional(),
  managerId: z.string().uuid().optional(),
  contactPhone: z.string().max(50).optional(),
  contactEmail: z.string().email().optional(),
  capacityVolumeM3: z.number().nonnegative().optional(),
  capacityWeightKg: z.number().nonnegative().optional(),
  isDefault: z.boolean().default(false),
});
export type CreateWarehouseInput = z.infer<typeof createWarehouseSchema>;

export const updateWarehouseSchema = createWarehouseSchema.partial().extend({
  status: z.enum(["active", "inactive"]).optional(),
  isActive: z.boolean().optional(),
});
export type UpdateWarehouseInput = z.infer<typeof updateWarehouseSchema>;
