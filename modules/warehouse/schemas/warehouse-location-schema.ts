import { z } from "zod";

export const NODE_TYPES = [
  "zone",
  "row",
  "rack",
  "shelf",
  "bin",
  "staging_area",
  "loading_zone",
  "repair_zone",
  "quarantine_area",
  "dock",
  "charging_station",
] as const;

export const LOCATION_CATEGORIES = [
  "general",
  "high_value",
  "led_panels",
  "audio",
  "lighting",
  "camera",
  "rigging",
  "consumables",
  "repair",
  "damaged",
  "reserved",
  "quarantine",
  "dispatch",
  "receiving",
  "returns",
  "charging",
  "battery",
  "cable_storage",
  "accessory_storage",
  "custom",
] as const;

export const createWarehouseLocationSchema = z.object({
  warehouseId: z.string().uuid("Select a warehouse"),
  parentId: z.string().uuid().optional(),
  nodeType: z.enum(NODE_TYPES),
  locationCategory: z.enum(LOCATION_CATEGORIES).optional(),
  code: z.string().min(1, "Code is required").max(50),
  name: z.string().max(200).optional(),
  capacityUnits: z.number().nonnegative().optional(),
  weightLimitKg: z.number().nonnegative().optional(),
  lengthCm: z.number().nonnegative().optional(),
  widthCm: z.number().nonnegative().optional(),
  heightCm: z.number().nonnegative().optional(),
});
export type CreateWarehouseLocationInput = z.infer<typeof createWarehouseLocationSchema>;

// Deliberately excludes warehouseId/parentId/nodeType/code — changing a node's structural
// identity after creation would require re-deriving full_code for it and every descendant,
// which is a "move/rebuild" operation, not a field edit. Re-parenting is a future feature if
// ever needed, not an update-schema concern.
export const updateWarehouseLocationSchema = z.object({
  locationCategory: z.enum(LOCATION_CATEGORIES).optional(),
  name: z.string().max(200).optional(),
  capacityUnits: z.number().nonnegative().optional(),
  weightLimitKg: z.number().nonnegative().optional(),
  lengthCm: z.number().nonnegative().optional(),
  widthCm: z.number().nonnegative().optional(),
  heightCm: z.number().nonnegative().optional(),
  status: z.enum(["active", "inactive"]).optional(),
});
export type UpdateWarehouseLocationInput = z.infer<typeof updateWarehouseLocationSchema>;
