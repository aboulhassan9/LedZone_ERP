import { z } from "zod";

export const PICK_METHODS = ["fifo", "lifo", "manual", "optimized", "category", "priority"] as const;

const pickLineSchema = z
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

export const createPickListSchema = z.object({
  warehouseId: z.string().uuid("Select a warehouse"),
  method: z.enum(PICK_METHODS).default("manual"),
  assignedTo: z.string().uuid().optional(),
  lines: z.array(pickLineSchema).min(1, "At least one line is required"),
});
export type CreatePickListInput = z.infer<typeof createPickListSchema>;

// toWarehouseLocationId is optional: picking can just stage-mark an item ready without
// physically relocating it yet (relocation happens via equipmentItemService.pickEquipmentItem
// when a staging destination is supplied).
export const completePickLineSchema = z.object({
  toWarehouseLocationId: z.string().uuid().optional(),
  reason: z.string().max(500).optional(),
});
export type CompletePickLineInput = z.infer<typeof completePickLineSchema>;
