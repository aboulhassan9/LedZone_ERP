import "server-only";
import { createClient } from "@/lib/supabase/server";
import type {
  CreateEventInput,
  UpdateEventInput,
  ListEventsInput,
} from "@/modules/events/schemas/event-schema";

export type EventRow = {
  id: string;
  name: string;
  customer_id: string | null;
  venue: string | null;
  event_start_at: string;
  event_end_at: string;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

const EVENT_COLUMNS =
  "id, name, customer_id, venue, event_start_at, event_end_at, status, notes, created_at, updated_at";

export const eventRepository = {
  async findById(id: string): Promise<EventRow | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("events")
      .select(EVENT_COLUMNS)
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async list(filters: ListEventsInput): Promise<EventRow[]> {
    const supabase = await createClient();
    let query = supabase.from("events").select(EVENT_COLUMNS).is("deleted_at", null);
    if (filters.status) query = query.eq("status", filters.status);
    const { data, error } = await query.order("event_start_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async create(input: CreateEventInput, userId: string): Promise<EventRow> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("events")
      .insert({
        name: input.name,
        customer_id: input.customerId ?? null,
        venue: input.venue ?? null,
        event_start_at: input.eventStartAt,
        event_end_at: input.eventEndAt,
        notes: input.notes ?? null,
        created_by: userId,
        updated_by: userId,
      })
      .select(EVENT_COLUMNS)
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: string, input: UpdateEventInput, userId: string): Promise<EventRow> {
    const supabase = await createClient();
    const patch: Record<string, unknown> = { updated_by: userId };
    if (input.name !== undefined) patch.name = input.name;
    if (input.customerId !== undefined) patch.customer_id = input.customerId;
    if (input.venue !== undefined) patch.venue = input.venue;
    if (input.eventStartAt !== undefined) patch.event_start_at = input.eventStartAt;
    if (input.eventEndAt !== undefined) patch.event_end_at = input.eventEndAt;
    if (input.notes !== undefined) patch.notes = input.notes;

    const { data, error } = await supabase
      .from("events")
      .update(patch)
      .eq("id", id)
      .select(EVENT_COLUMNS)
      .single();
    if (error) throw error;
    return data;
  },

  async setStatus(id: string, status: string, userId: string): Promise<EventRow> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("events")
      .update({ status, updated_by: userId })
      .eq("id", id)
      .select(EVENT_COLUMNS)
      .single();
    if (error) throw error;
    return data;
  },

  async softDelete(id: string, userId: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase
      .from("events")
      .update({ deleted_at: new Date().toISOString(), deleted_by: userId })
      .eq("id", id);
    if (error) throw error;
  },
};
