import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { CreatePerformanceReviewInput } from "@/modules/hr/schemas/performance-review-schema";

export type PerformanceReviewRow = {
  id: string;
  crew_member_id: string;
  review_date: string;
  reviewer_id: string | null;
  rating: number | null;
  comments: string | null;
  created_at: string;
};

const REVIEW_COLUMNS = "id, crew_member_id, review_date, reviewer_id, rating, comments, created_at";

export const performanceReviewRepository = {
  async findByCrewMember(crewMemberId: string): Promise<PerformanceReviewRow[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("performance_reviews")
      .select(REVIEW_COLUMNS)
      .eq("crew_member_id", crewMemberId)
      .order("review_date", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async create(
    crewMemberId: string,
    input: CreatePerformanceReviewInput,
    userId: string
  ): Promise<PerformanceReviewRow> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("performance_reviews")
      .insert({
        crew_member_id: crewMemberId,
        review_date: input.reviewDate,
        reviewer_id: userId,
        rating: input.rating ?? null,
        comments: input.comments ?? null,
        created_by: userId,
      })
      .select(REVIEW_COLUMNS)
      .single();
    if (error) throw error;
    return data;
  },
};
