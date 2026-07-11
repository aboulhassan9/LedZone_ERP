import { z } from "zod";

export const cancelPlanSchema = z.object({
  reason: z.string().max(1000).optional(),
});
export type CancelPlanInput = z.infer<typeof cancelPlanSchema>;
