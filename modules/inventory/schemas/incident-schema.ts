import { z } from "zod";

export const createDamageReportSchema = z.object({
  itemId: z.string().uuid("Select an item"),
  description: z.string().min(1, "Description is required").max(2000),
  severity: z.enum(["minor", "major", "critical"]),
  repairCost: z.number().nonnegative().optional(),
  currencyCode: z.string().length(3).optional(),
});
export type CreateDamageReportInput = z.infer<typeof createDamageReportSchema>;

export const createLostReportSchema = z.object({
  itemId: z.string().uuid("Select an item"),
  description: z.string().max(2000).optional(),
  lastKnownLocationId: z.string().uuid().optional(),
});
export type CreateLostReportInput = z.infer<typeof createLostReportSchema>;
