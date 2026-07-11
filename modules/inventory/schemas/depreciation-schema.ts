import { z } from "zod";

// Inputs only — purchase cost, salvage value, useful life, method. No calculation logic
// lives here; the Finance module posts computed depreciation entries later.
export const setDepreciationPolicySchema = z.object({
  itemId: z.string().uuid("Select an item"),
  purchaseCost: z.number().nonnegative(),
  purchaseCurrency: z.string().length(3, "Select a currency"),
  salvageValue: z.number().nonnegative().default(0),
  salvageCurrency: z.string().length(3, "Select a currency"),
  usefulLifeMonths: z.number().int().positive(),
  method: z.enum(["straight_line", "declining_balance", "none"]).default("straight_line"),
  startDate: z.string().date().optional(),
});
export type SetDepreciationPolicyInput = z.infer<typeof setDepreciationPolicySchema>;

export const updateDepreciationPolicySchema = setDepreciationPolicySchema
  .omit({ itemId: true })
  .partial();
export type UpdateDepreciationPolicyInput = z.infer<typeof updateDepreciationPolicySchema>;
