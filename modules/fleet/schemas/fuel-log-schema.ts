import { z } from "zod";

export const createFuelLogSchema = z.object({
  fuelDate: z.string().min(1, "Date is required"),
  liters: z.coerce.number().positive("Liters must be greater than zero"),
  cost: z.coerce.number().min(0, "Cost can't be negative"),
  currencyCode: z.string().min(1, "Select a currency"),
  odometerKm: z.coerce.number().int().min(0).optional(),
  notes: z.string().max(500).optional(),
});
export type CreateFuelLogInput = z.infer<typeof createFuelLogSchema>;
