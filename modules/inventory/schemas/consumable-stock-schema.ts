import { z } from "zod";

export const updateConsumableStockSchema = z.object({
  modelId: z.string().uuid("Select a consumable model"),
  storageLocationId: z.string().uuid("Select a storage location"),
  movementType: z.enum(["received", "consumed", "adjusted", "transferred_in", "transferred_out"]),
  quantityDelta: z.number().refine((n) => n !== 0, "Quantity change can't be zero."),
  unitOfMeasure: z.string().max(20).default("pcs"),
  referenceNote: z.string().max(1000).optional(),
});
export type UpdateConsumableStockInput = z.infer<typeof updateConsumableStockSchema>;
