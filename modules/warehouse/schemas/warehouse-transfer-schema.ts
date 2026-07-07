import { z } from "zod";

const transferLineSchema = z
  .object({
    itemId: z.string().uuid().optional(),
    modelId: z.string().uuid().optional(),
    quantity: z.number().positive().optional(),
  })
  .refine((l) => (l.itemId != null) !== (l.modelId != null), {
    message: "Each line must set exactly one of itemId or modelId.",
  })
  .refine((l) => l.modelId == null || (l.quantity != null && l.quantity > 0), {
    message: "Consumable lines require a positive quantity.",
  });

export const createTransferRequestSchema = z.object({
  fromWarehouseId: z.string().uuid("Select a source warehouse"),
  toWarehouseId: z.string().uuid("Select a destination warehouse"),
  fromLocationId: z.string().uuid().optional(),
  toLocationId: z.string().uuid().optional(),
  notes: z.string().max(2000).optional(),
  lines: z.array(transferLineSchema).min(1, "At least one line is required"),
});
export type CreateTransferRequestInput = z.infer<typeof createTransferRequestSchema>;

export const rejectTransferSchema = z.object({
  reason: z.string().min(1, "A reason is required").max(2000),
});
export type RejectTransferInput = z.infer<typeof rejectTransferSchema>;

export const cancelTransferSchema = z.object({
  reason: z.string().max(2000).optional(),
});
export type CancelTransferInput = z.infer<typeof cancelTransferSchema>;
