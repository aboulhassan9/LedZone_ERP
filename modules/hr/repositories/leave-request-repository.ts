import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { CreateLeaveRequestInput } from "@/modules/hr/schemas/leave-request-schema";

export type LeaveRequestRow = {
  id: string;
  crew_member_id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  status: string;
  reason: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

const LEAVE_COLUMNS =
  "id, crew_member_id, leave_type, start_date, end_date, status, reason, notes, created_at, updated_at";

export const leaveRequestRepository = {
  async findById(id: string): Promise<LeaveRequestRow | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("leave_requests")
      .select(LEAVE_COLUMNS)
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async findByCrewMember(crewMemberId: string): Promise<LeaveRequestRow[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("leave_requests")
      .select(LEAVE_COLUMNS)
      .eq("crew_member_id", crewMemberId)
      .order("start_date", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async list(): Promise<LeaveRequestRow[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("leave_requests")
      .select(LEAVE_COLUMNS)
      .order("start_date", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async create(
    crewMemberId: string,
    input: CreateLeaveRequestInput,
    userId: string
  ): Promise<LeaveRequestRow> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("leave_requests")
      .insert({
        crew_member_id: crewMemberId,
        leave_type: input.leaveType,
        start_date: input.startDate,
        end_date: input.endDate,
        reason: input.reason ?? null,
        notes: input.notes ?? null,
        status: "pending",
        created_by: userId,
        updated_by: userId,
      })
      .select(LEAVE_COLUMNS)
      .single();
    if (error) throw error;
    return data;
  },

  async setStatus(id: string, status: string, userId: string): Promise<LeaveRequestRow> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("leave_requests")
      .update({ status, updated_by: userId })
      .eq("id", id)
      .select(LEAVE_COLUMNS)
      .single();
    if (error) throw error;
    return data;
  },
};
