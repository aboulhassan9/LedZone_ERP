import { z } from "zod";

export const EVENT_STATUSES = ["planning", "confirmed", "in_progress", "completed", "cancelled"] as const;

export const createEventSchema = z
  .object({
    name: z.string().min(1, "Name is required").max(300),
    customerId: z.string().uuid().optional(),
    venue: z.string().max(300).optional(),
    eventStartAt: z.string().min(1, "Start is required"),
    eventEndAt: z.string().min(1, "End is required"),
    notes: z.string().max(2000).optional(),
  })
  .refine((v) => new Date(v.eventEndAt) > new Date(v.eventStartAt), {
    message: "End must be after start",
    path: ["eventEndAt"],
  });
export type CreateEventInput = z.infer<typeof createEventSchema>;

export const updateEventSchema = z.object({
  name: z.string().min(1).max(300).optional(),
  customerId: z.string().uuid().optional(),
  venue: z.string().max(300).optional(),
  eventStartAt: z.string().min(1).optional(),
  eventEndAt: z.string().min(1).optional(),
  notes: z.string().max(2000).optional(),
});
export type UpdateEventInput = z.infer<typeof updateEventSchema>;

export const setEventStatusSchema = z.object({
  status: z.enum(EVENT_STATUSES),
});
export type SetEventStatusInput = z.infer<typeof setEventStatusSchema>;

export const listEventsSchema = z.object({
  status: z.enum(EVENT_STATUSES).optional(),
});
export type ListEventsInput = z.infer<typeof listEventsSchema>;
