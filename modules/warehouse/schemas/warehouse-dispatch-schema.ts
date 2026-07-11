import { z } from "zod";

export const DISPATCH_DESTINATION_TYPES = [
  "event",
  "customer",
  "repair",
  "warehouse",
  "truck",
  "vendor",
] as const;

const dispatchLineSchema = z
  .object({
    itemId: z.string().uuid().optional(),
    modelId: z.string().uuid().optional(),
    quantity: z.number().positive().optional(),
    sourceWarehouseLocationId: z.string().uuid().optional(),
  })
  .refine((l) => (l.itemId != null) !== (l.modelId != null), {
    message: "Each line must set exactly one of itemId or modelId.",
  })
  .refine((l) => l.modelId == null || (l.quantity != null && l.quantity > 0), {
    message: "Consumable lines require a positive quantity.",
  })
  .refine((l) => l.modelId == null || l.sourceWarehouseLocationId != null, {
    message: "Consumable lines require a source location to dispatch from.",
  });

export const createDispatchSchema = z.object({
  warehouseId: z.string().uuid("Select a warehouse"),
  destinationType: z.enum(DISPATCH_DESTINATION_TYPES),
  destinationReference: z.string().max(500).optional(),
  notes: z.string().max(2000).optional(),
  lines: z.array(dispatchLineSchema).min(1, "At least one line is required"),
});
export type CreateDispatchInput = z.infer<typeof createDispatchSchema>;
