import { z } from "zod";

export const createPerformanceReviewSchema = z.object({
  reviewDate: z.string().min(1, "Review date is required"),
  rating: z.coerce.number().int().min(1).max(5).optional(),
  comments: z.string().max(2000).optional(),
});
export type CreatePerformanceReviewInput = z.infer<typeof createPerformanceReviewSchema>;
