import { z } from "zod";

export const createMaintenanceScheduleSchema = z.object({
  itemId: z.string().uuid("Select an item"),
  maintenanceType: z.string().min(1, "Maintenance type is required").max(200),
  intervalDays: z.number().int().positive(),
  lastPerformedDate: z.string().date().optional(),
  nextDueDate: z.string().date().optional(),
});
export type CreateMaintenanceScheduleInput = z.infer<typeof createMaintenanceScheduleSchema>;

export const createMaintenanceRecordSchema = z.object({
  itemId: z.string().uuid("Select an item"),
  maintenanceType: z.string().min(1, "Maintenance type is required").max(200),
  scheduleId: z.string().uuid().optional(),
  damageReportId: z.string().uuid().optional(),
  description: z.string().max(2000).optional(),
  cost: z.number().nonnegative().optional(),
  currencyCode: z.string().length(3).optional(),
  technicianName: z.string().max(200).optional(),
  nextRecommendedDate: z.string().date().optional(),
  markItemAvailable: z.boolean().default(false),
});
export type CreateMaintenanceRecordInput = z.infer<typeof createMaintenanceRecordSchema>;
