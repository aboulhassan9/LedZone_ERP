import { z } from "zod";

export const PERIOD_TYPES = ["weekly", "monthly"] as const;

export const generateFinancialSnapshotSchema = z.object({
  periodType: z.enum(PERIOD_TYPES),
  referenceDate: z.string().min(1, "Pick a date within the period"),
});
export type GenerateFinancialSnapshotInput = z.infer<typeof generateFinancialSnapshotSchema>;
