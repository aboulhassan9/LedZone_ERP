import "server-only";
import { createClient } from "@/lib/supabase/server";
import type {
  CreateChecklistItemInput,
  UpdateChecklistItemInput,
} from "@/modules/events/schemas/checklist-item-schema";

export type EventChecklistItemRow = {
  id: string;
  event_id: string;
  title: string;
  is_done: boolean;
  due_at: string | null;
  assigned_to: string | null;
  notes: string | null;
  sequence: number;
};

const CHECKLIST_COLUMNS = "id, event_id, title, is_done, due_at, assigned_to, notes, sequence";

export const eventChecklistRepository = {
  async findByEvent(eventId: string): Promise<EventChecklistItemRow[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("event_checklist_items")
      .select(CHECKLIST_COLUMNS)
      .eq("event_id", eventId)
      .order("sequence", { ascending: true });
    if (error) throw error;
    return data ?? [];
  },

  async create(
    eventId: string,
    input: CreateChecklistItemInput,
    userId: string
  ): Promise<EventChecklistItemRow> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("event_checklist_items")
      .insert({
        event_id: eventId,
        title: input.title,
        due_at: input.dueAt ?? null,
        assigned_to: input.assignedTo ?? null,
        notes: input.notes ?? null,
        sequence: input.sequence,
        created_by: userId,
        updated_by: userId,
      })
      .select(CHECKLIST_COLUMNS)
      .single();
    if (error) throw error;
    return data;
  },

  async update(
    id: string,
    input: UpdateChecklistItemInput,
    userId: string
  ): Promise<EventChecklistItemRow> {
    const supabase = await createClient();
    const patch: Record<string, unknown> = { updated_by: userId };
    if (input.title !== undefined) patch.title = input.title;
    if (input.isDone !== undefined) patch.is_done = input.isDone;
    if (input.dueAt !== undefined) patch.due_at = input.dueAt;
    if (input.assignedTo !== undefined) patch.assigned_to = input.assignedTo;
    if (input.notes !== undefined) patch.notes = input.notes;
    if (input.sequence !== undefined) patch.sequence = input.sequence;

    const { data, error } = await supabase
      .from("event_checklist_items")
      .update(patch)
      .eq("id", id)
      .select(CHECKLIST_COLUMNS)
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("event_checklist_items").delete().eq("id", id);
    if (error) throw error;
  },
};
