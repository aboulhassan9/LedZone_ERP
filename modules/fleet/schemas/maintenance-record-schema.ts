import { z } from "zod";

export const MAINTENANCE_TYPES = ["scheduled_service", "repair", "inspection", "tire", "other"] as const;

export const createMaintenanceRecordSchema = z.object({
  maintenanceType: z.enum(MAINTENANCE_TYPES),
  description: z.string().min(1, "Description is required").max(500),
  cost: z.coerce.number().min(0).optional(),
  currencyCode: z.string().optional(),
  odometerKm: z.coerce.number().int().min(0).optional(),
  serviceDate: z.string().min(1, "Service date is required"),
  nextServiceDate: z.string().optional(),
  performedBy: z.string().max(300).optional(),
  notes: z.string().max(1000).optional(),
});
export type CreateMaintenanceRecordInput = z.infer<typeof createMaintenanceRecordSchema>;
