import "server-only";
import { createClient } from "@/lib/supabase/server";
import type {
  CreateTimelineItemInput,
  UpdateTimelineItemInput,
} from "@/modules/events/schemas/timeline-item-schema";

export type EventTimelineItemRow = {
  id: string;
  event_id: string;
  title: string;
  scheduled_at: string;
  duration_minutes: number | null;
  notes: string | null;
  sequence: number;
};

const TIMELINE_COLUMNS = "id, event_id, title, scheduled_at, duration_minutes, notes, sequence";

export const eventTimelineRepository = {
  async findByEvent(eventId: string): Promise<EventTimelineItemRow[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("event_timeline_items")
      .select(TIMELINE_COLUMNS)
      .eq("event_id", eventId)
      .order("scheduled_at", { ascending: true });
    if (error) throw error;
    return data ?? [];
  },

  async create(
    eventId: string,
    input: CreateTimelineItemInput,
    userId: string
  ): Promise<EventTimelineItemRow> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("event_timeline_items")
      .insert({
        event_id: eventId,
        title: input.title,
        scheduled_at: input.scheduledAt,
        duration_minutes: input.durationMinutes ?? null,
        notes: input.notes ?? null,
        sequence: input.sequence,
        created_by: userId,
        updated_by: userId,
      })
      .select(TIMELINE_COLUMNS)
      .single();
    if (error) throw error;
    return data;
  },

  async update(
    id: string,
    input: UpdateTimelineItemInput,
    userId: string
  ): Promise<EventTimelineItemRow> {
    const supabase = await createClient();
    const patch: Record<string, unknown> = { updated_by: userId };
    if (input.title !== undefined) patch.title = input.title;
    if (input.scheduledAt !== undefined) patch.scheduled_at = input.scheduledAt;
    if (input.durationMinutes !== undefined) patch.duration_minutes = input.durationMinutes;
    if (input.notes !== undefined) patch.notes = input.notes;
    if (input.sequence !== undefined) patch.sequence = input.sequence;

    const { data, error } = await supabase
      .from("event_timeline_items")
      .update(patch)
      .eq("id", id)
      .select(TIMELINE_COLUMNS)
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("event_timeline_items").delete().eq("id", id);
    if (error) throw error;
  },
};
