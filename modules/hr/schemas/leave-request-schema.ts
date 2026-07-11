import { z } from "zod";

export const LEAVE_TYPES = ["annual", "sick", "unpaid", "other"] as const;
export const LEAVE_STATUSES = ["pending", "approved", "rejected", "cancelled"] as const;

export const createLeaveRequestSchema = z
  .object({
    leaveType: z.enum(LEAVE_TYPES),
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().min(1, "End date is required"),
    reason: z.string().max(500).optional(),
    notes: z.string().max(1000).optional(),
  })
  .refine((v) => new Date(v.endDate) >= new Date(v.startDate), {
    message: "End date must be on or after the start date",
    path: ["endDate"],
  });
export type CreateLeaveRequestInput = z.infer<typeof createLeaveRequestSchema>;

export const setLeaveRequestStatusSchema = z.object({
  status: z.enum(LEAVE_STATUSES),
});
export type SetLeaveRequestStatusInput = z.infer<typeof setLeaveRequestStatusSchema>;
