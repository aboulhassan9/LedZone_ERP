import { z } from "zod";

export const createChecklistItemSchema = z.object({
  title: z.string().min(1, "Title is required").max(300),
  dueAt: z.string().optional(),
  assignedTo: z.string().uuid().optional(),
  notes: z.string().max(1000).optional(),
  sequence: z.coerce.number().int().default(0),
});
export type CreateChecklistItemInput = z.infer<typeof createChecklistItemSchema>;

export const updateChecklistItemSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  isDone: z.boolean().optional(),
  dueAt: z.string().optional(),
  assignedTo: z.string().uuid().optional(),
  notes: z.string().max(1000).optional(),
  sequence: z.coerce.number().int().optional(),
});
export type UpdateChecklistItemInput = z.infer<typeof updateChecklistItemSchema>;
