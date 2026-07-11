import { z } from "zod";

export const createPlanItemSchema = z.object({
  modelId: z.string().uuid("Select a model"),
  quantityRequested: z.coerce.number().positive("Quantity must be greater than zero"),
  warehouseId: z.string().uuid().optional(),
  notes: z.string().max(1000).optional(),
});
export type CreatePlanItemInput = z.infer<typeof createPlanItemSchema>;

export const updatePlanItemSchema = z.object({
  quantityRequested: z.coerce.number().positive().optional(),
  warehouseId: z.string().uuid().optional(),
  notes: z.string().max(1000).optional(),
});
export type UpdatePlanItemInput = z.infer<typeof updatePlanItemSchema>;
