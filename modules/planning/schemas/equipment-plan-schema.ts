import { z } from "zod";

export const PLAN_STATUSES = [
  "draft",
  "planning",
  "ready",
  "approved",
  "prepared",
  "loaded",
  "completed",
  "cancelled",
] as const;

export const createEquipmentPlanSchema = z
  .object({
    name: z.string().min(1, "Name is required").max(300),
    eventStartAt: z.string().datetime({ message: "eventStartAt must be an ISO timestamp" }),
    eventEndAt: z.string().datetime({ message: "eventEndAt must be an ISO timestamp" }),
    customerId: z.string().uuid().optional(),
    eventId: z.string().uuid().optional(),
    primaryWarehouseId: z.string().uuid().optional(),
    notes: z.string().max(2000).optional(),
  })
  .refine((v) => new Date(v.eventEndAt).getTime() > new Date(v.eventStartAt).getTime(), {
    message: "eventEndAt must be after eventStartAt",
    path: ["eventEndAt"],
  });
export type CreateEquipmentPlanInput = z.infer<typeof createEquipmentPlanSchema>;

export const updateEquipmentPlanSchema = z
  .object({
    name: z.string().min(1).max(300).optional(),
    eventStartAt: z.string().datetime().optional(),
    eventEndAt: z.string().datetime().optional(),
    customerId: z.string().uuid().optional(),
    eventId: z.string().uuid().optional(),
    primaryWarehouseId: z.string().uuid().optional(),
    notes: z.string().max(2000).optional(),
  })
  .refine(
    (v) =>
      !v.eventStartAt ||
      !v.eventEndAt ||
      new Date(v.eventEndAt).getTime() > new Date(v.eventStartAt).getTime(),
    { message: "eventEndAt must be after eventStartAt", path: ["eventEndAt"] }
  );
export type UpdateEquipmentPlanInput = z.infer<typeof updateEquipmentPlanSchema>;

export const listEquipmentPlansSchema = z.object({
  status: z.enum(PLAN_STATUSES).optional(),
  warehouseId: z.string().uuid().optional(),
});
export type ListEquipmentPlansInput = z.infer<typeof listEquipmentPlansSchema>;
