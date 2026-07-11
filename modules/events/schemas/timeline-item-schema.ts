import { z } from "zod";

export const createTimelineItemSchema = z.object({
  title: z.string().min(1, "Title is required").max(300),
  scheduledAt: z.string().min(1, "Scheduled time is required"),
  durationMinutes: z.coerce.number().int().positive().optional(),
  notes: z.string().max(1000).optional(),
  sequence: z.coerce.number().int().default(0),
});
export type CreateTimelineItemInput = z.infer<typeof createTimelineItemSchema>;

export const updateTimelineItemSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  scheduledAt: z.string().min(1).optional(),
  durationMinutes: z.coerce.number().int().positive().optional(),
  notes: z.string().max(1000).optional(),
  sequence: z.coerce.number().int().optional(),
});
export type UpdateTimelineItemInput = z.infer<typeof updateTimelineItemSchema>;
