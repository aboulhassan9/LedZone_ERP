import { z } from "zod";

const CONDITIONS = ["new", "good", "fair", "poor", "damaged"] as const;

export const createEquipmentItemSchema = z.object({
  modelId: z.string().uuid("Select a model"),
  serialNumber: z.string().max(200).optional(),
  purchaseId: z.string().uuid().optional(),
  storageLocationId: z.string().uuid().optional(),
  currentCondition: z.enum(CONDITIONS).default("new"),
  notes: z.string().max(2000).optional(),
});
export type CreateEquipmentItemInput = z.infer<typeof createEquipmentItemSchema>;

// Deliberately excludes current_status and current_storage_location_id — those change
// only through transferEquipmentItem/checkOutEquipmentItem/checkInEquipmentItem/
// createDamageReport/createLostReport, so business rules around state transitions stay
// centralized instead of being bypassable via a generic field update.
export const updateEquipmentItemSchema = z.object({
  serialNumber: z.string().max(200).optional(),
  currentCondition: z.enum(CONDITIONS).optional(),
  notes: z.string().max(2000).optional(),
});
export type UpdateEquipmentItemInput = z.infer<typeof updateEquipmentItemSchema>;

export const transferEquipmentItemSchema = z.object({
  toStorageLocationId: z.string().uuid("Select a destination location"),
  referenceNote: z.string().max(1000).optional(),
});
export type TransferEquipmentItemInput = z.infer<typeof transferEquipmentItemSchema>;

export const checkOutEquipmentItemSchema = z.object({
  toStorageLocationId: z.string().uuid("Select where this item is being dispatched from/to"),
  referenceNote: z.string().max(1000).optional(),
});
export type CheckOutEquipmentItemInput = z.infer<typeof checkOutEquipmentItemSchema>;

export const checkInEquipmentItemSchema = z.object({
  toStorageLocationId: z.string().uuid("Select the return location"),
  referenceNote: z.string().max(1000).optional(),
});
export type CheckInEquipmentItemInput = z.infer<typeof checkInEquipmentItemSchema>;
