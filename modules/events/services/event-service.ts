import "server-only";
import { assertAnyPermission } from "@/modules/events/shared/authorize";
import { logEventsAudit } from "@/modules/events/shared/audit";
import { ConflictError, NotFoundError, toEventsError } from "@/modules/events/errors";
import {
  createEventSchema,
  updateEventSchema,
  setEventStatusSchema,
  listEventsSchema,
  type CreateEventInput,
  type UpdateEventInput,
  type SetEventStatusInput,
  type ListEventsInput,
} from "@/modules/events/schemas/event-schema";
import {
  createChecklistItemSchema,
  updateChecklistItemSchema,
  type CreateChecklistItemInput,
  type UpdateChecklistItemInput,
} from "@/modules/events/schemas/checklist-item-schema";
import {
  createTimelineItemSchema,
  updateTimelineItemSchema,
  type CreateTimelineItemInput,
  type UpdateTimelineItemInput,
} from "@/modules/events/schemas/timeline-item-schema";
import { eventRepository, type EventRow } from "@/modules/events/repositories/event-repository";
import {
  eventChecklistRepository,
  type EventChecklistItemRow,
} from "@/modules/events/repositories/event-checklist-repository";
import {
  eventTimelineRepository,
  type EventTimelineItemRow,
} from "@/modules/events/repositories/event-timeline-repository";

// An event's status is a straightforward project pipeline, not a physical-state machine like
// equipment_items -- a lightweight map is proportionate here, same decision made for
// modules/crm/services/quote-service.ts's TRANSITIONS.
const TRANSITIONS: Record<string, string[]> = {
  planning: ["confirmed", "cancelled"],
  confirmed: ["in_progress", "cancelled"],
  in_progress: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

async function requireEvent(id: string): Promise<EventRow> {
  const event = await eventRepository.findById(id);
  if (!event) throw new NotFoundError("Event");
  return event;
}

async function createEvent(input: CreateEventInput): Promise<EventRow> {
  const userId = await assertAnyPermission(["events.manage", "events.create"]);
  const parsed = createEventSchema.parse(input);

  try {
    const event = await eventRepository.create(parsed, userId);
    await logEventsAudit("event.created", "events", event.id, { name: parsed.name });
    return event;
  } catch (error) {
    throw toEventsError(error, "Event");
  }
}

async function updateEvent(id: string, input: UpdateEventInput): Promise<EventRow> {
  const userId = await assertAnyPermission(["events.manage", "events.update"]);
  const parsed = updateEventSchema.parse(input);
  await requireEvent(id);

  try {
    const event = await eventRepository.update(id, parsed, userId);
    await logEventsAudit("event.updated", "events", id, parsed);
    return event;
  } catch (error) {
    throw toEventsError(error, "Event");
  }
}

async function getEvent(id: string): Promise<EventRow> {
  await assertAnyPermission(["events.manage", "events.view"]);
  return requireEvent(id);
}

async function listEvents(filters: ListEventsInput): Promise<EventRow[]> {
  await assertAnyPermission(["events.manage", "events.view"]);
  const parsed = listEventsSchema.parse(filters);
  return eventRepository.list(parsed);
}

async function setEventStatus(id: string, input: SetEventStatusInput): Promise<EventRow> {
  const userId = await assertAnyPermission(["events.manage", "events.update"]);
  const parsed = setEventStatusSchema.parse(input);
  const event = await requireEvent(id);

  if (!TRANSITIONS[event.status]?.includes(parsed.status)) {
    throw new ConflictError(`Cannot move a "${event.status}" event to "${parsed.status}".`);
  }

  try {
    const updated = await eventRepository.setStatus(id, parsed.status, userId);
    await logEventsAudit(`event.${parsed.status}`, "events", id);
    return updated;
  } catch (error) {
    throw toEventsError(error, "Event");
  }
}

async function deleteEvent(id: string): Promise<void> {
  const userId = await assertAnyPermission(["events.manage", "events.delete"]);
  await requireEvent(id);

  try {
    await eventRepository.softDelete(id, userId);
    await logEventsAudit("event.deleted", "events", id);
  } catch (error) {
    throw toEventsError(error, "Event");
  }
}

async function listChecklistItems(eventId: string): Promise<EventChecklistItemRow[]> {
  await assertAnyPermission(["events.manage", "events.view"]);
  return eventChecklistRepository.findByEvent(eventId);
}

async function addChecklistItem(
  eventId: string,
  input: CreateChecklistItemInput
): Promise<EventChecklistItemRow> {
  const userId = await assertAnyPermission(["events.manage", "events.update"]);
  const parsed = createChecklistItemSchema.parse(input);
  await requireEvent(eventId);

  try {
    const item = await eventChecklistRepository.create(eventId, parsed, userId);
    await logEventsAudit("event_checklist_item.added", "event_checklist_items", item.id, { eventId });
    return item;
  } catch (error) {
    throw toEventsError(error, "Checklist item");
  }
}

async function updateChecklistItem(
  id: string,
  eventId: string,
  input: UpdateChecklistItemInput
): Promise<EventChecklistItemRow> {
  const userId = await assertAnyPermission(["events.manage", "events.update"]);
  const parsed = updateChecklistItemSchema.parse(input);

  try {
    const item = await eventChecklistRepository.update(id, parsed, userId);
    await logEventsAudit("event_checklist_item.updated", "event_checklist_items", id, { eventId, ...parsed });
    return item;
  } catch (error) {
    throw toEventsError(error, "Checklist item");
  }
}

async function removeChecklistItem(id: string, eventId: string): Promise<void> {
  await assertAnyPermission(["events.manage", "events.update"]);
  await eventChecklistRepository.delete(id);
  await logEventsAudit("event_checklist_item.removed", "event_checklist_items", id, { eventId });
}

async function listTimelineItems(eventId: string): Promise<EventTimelineItemRow[]> {
  await assertAnyPermission(["events.manage", "events.view"]);
  return eventTimelineRepository.findByEvent(eventId);
}

async function addTimelineItem(
  eventId: string,
  input: CreateTimelineItemInput
): Promise<EventTimelineItemRow> {
  const userId = await assertAnyPermission(["events.manage", "events.update"]);
  const parsed = createTimelineItemSchema.parse(input);
  await requireEvent(eventId);

  try {
    const item = await eventTimelineRepository.create(eventId, parsed, userId);
    await logEventsAudit("event_timeline_item.added", "event_timeline_items", item.id, { eventId });
    return item;
  } catch (error) {
    throw toEventsError(error, "Timeline item");
  }
}

async function updateTimelineItem(
  id: string,
  eventId: string,
  input: UpdateTimelineItemInput
): Promise<EventTimelineItemRow> {
  const userId = await assertAnyPermission(["events.manage", "events.update"]);
  const parsed = updateTimelineItemSchema.parse(input);

  try {
    const item = await eventTimelineRepository.update(id, parsed, userId);
    await logEventsAudit("event_timeline_item.updated", "event_timeline_items", id, { eventId, ...parsed });
    return item;
  } catch (error) {
    throw toEventsError(error, "Timeline item");
  }
}

async function removeTimelineItem(id: string, eventId: string): Promise<void> {
  await assertAnyPermission(["events.manage", "events.update"]);
  await eventTimelineRepository.delete(id);
  await logEventsAudit("event_timeline_item.removed", "event_timeline_items", id, { eventId });
}

export const eventService = {
  createEvent,
  updateEvent,
  getEvent,
  listEvents,
  setEventStatus,
  deleteEvent,
  listChecklistItems,
  addChecklistItem,
  updateChecklistItem,
  removeChecklistItem,
  listTimelineItems,
  addTimelineItem,
  updateTimelineItem,
  removeTimelineItem,
};
