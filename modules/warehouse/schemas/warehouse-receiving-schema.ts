import { z } from "zod";

export const RECEIVING_SOURCE_TYPES = [
  "supplier",
  "purchase_order",
  "customer_return",
  "repair",
  "internal_transfer",
  "manual",
] as const;

const receivingLineSchema = z
  .object({
    itemId: z.string().uuid().optional(),
    modelId: z.string().uuid().optional(),
    quantity: z.number().positive().optional(),
    conditionOnArrival: z.string().max(500).optional(),
    destinationWarehouseLocationId: z.string().uuid().optional(),
  })
  .refine((l) => (l.itemId != null) !== (l.modelId != null), {
    message: "Each line must set exactly one of itemId or modelId.",
  })
  .refine((l) => l.modelId == null || (l.quantity != null && l.quantity > 0), {
    message: "Consumable lines require a positive quantity.",
  });

export const createReceivingSchema = z.object({
  warehouseId: z.string().uuid("Select a warehouse"),
  sourceType: z.enum(RECEIVING_SOURCE_TYPES),
  purchaseId: z.string().uuid().optional(),
  referenceNote: z.string().max(2000).optional(),
  lines: z.array(receivingLineSchema).min(1, "At least one line is required"),
});
export type CreateReceivingInput = z.infer<typeof createReceivingSchema>;
