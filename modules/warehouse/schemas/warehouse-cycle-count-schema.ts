import { z } from "zod";

export const CYCLE_COUNT_SCOPE_TYPES = [
  "random",
  "scheduled",
  "category",
  "warehouse",
  "zone",
  "rack",
  "bin",
  "equipment",
  "consumables",
] as const;

const cycleCountLineInputSchema = z
  .object({
    itemId: z.string().uuid().optional(),
    modelId: z.string().uuid().optional(),
    expectedQty: z.number().nonnegative(),
  })
  .refine((l) => (l.itemId != null) !== (l.modelId != null), {
    message: "Each line must set exactly one of itemId or modelId.",
  });

export const createCycleCountSchema = z.object({
  warehouseId: z.string().uuid("Select a warehouse"),
  scopeType: z.enum(CYCLE_COUNT_SCOPE_TYPES),
  scopeLocationId: z.string().uuid().optional(),
  scheduledDate: z.string().date().optional(),
  lines: z.array(cycleCountLineInputSchema).min(1, "At least one line is required"),
});
export type CreateCycleCountInput = z.infer<typeof createCycleCountSchema>;

export const recordCountSchema = z.object({
  countedQty: z.number().nonnegative(),
});
export type RecordCountInput = z.infer<typeof recordCountSchema>;
