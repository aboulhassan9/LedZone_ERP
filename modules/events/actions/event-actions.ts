"use server";

import { revalidatePath } from "next/cache";
import { runAction } from "@/modules/events/shared/run-action";
import type { ActionResult } from "@/modules/warehouse/types/action-result";
import { eventService } from "@/modules/events/services/event-service";
import type {
  CreateEventInput,
  UpdateEventInput,
  SetEventStatusInput,
  ListEventsInput,
} from "@/modules/events/schemas/event-schema";
import type { CreateChecklistItemInput, UpdateChecklistItemInput } from "@/modules/events/schemas/checklist-item-schema";
import type { CreateTimelineItemInput, UpdateTimelineItemInput } from "@/modules/events/schemas/timeline-item-schema";
import type { EventRow } from "@/modules/events/repositories/event-repository";
import type { EventChecklistItemRow } from "@/modules/events/repositories/event-checklist-repository";
import type { EventTimelineItemRow } from "@/modules/events/repositories/event-timeline-repository";

function revalidateEvents(id?: string) {
  revalidatePath("/events");
  if (id) revalidatePath(`/events/${id}`);
}

export async function createEventAction(input: CreateEventInput): Promise<ActionResult<EventRow>> {
  const result = await runAction(() => eventService.createEvent(input));
  revalidateEvents();
  return result;
}

export async function updateEventAction(
  id: string,
  input: UpdateEventInput
): Promise<ActionResult<EventRow>> {
  const result = await runAction(() => eventService.updateEvent(id, input));
  revalidateEvents(id);
  return result;
}

export async function getEventAction(id: string): Promise<ActionResult<EventRow>> {
  return runAction(() => eventService.getEvent(id));
}

export async function listEventsAction(filters: ListEventsInput): Promise<ActionResult<EventRow[]>> {
  return runAction(() => eventService.listEvents(filters));
}

export async function setEventStatusAction(
  id: string,
  input: SetEventStatusInput
): Promise<ActionResult<EventRow>> {
  const result = await runAction(() => eventService.setEventStatus(id, input));
  revalidateEvents(id);
  return result;
}

export async function deleteEventAction(id: string): Promise<ActionResult<void>> {
  const result = await runAction(() => eventService.deleteEvent(id));
  revalidateEvents();
  return result;
}

export async function listChecklistItemsAction(
  eventId: string
): Promise<ActionResult<EventChecklistItemRow[]>> {
  return runAction(() => eventService.listChecklistItems(eventId));
}

export async function addChecklistItemAction(
  eventId: string,
  input: CreateChecklistItemInput
): Promise<ActionResult<EventChecklistItemRow>> {
  const result = await runAction(() => eventService.addChecklistItem(eventId, input));
  revalidateEvents(eventId);
  return result;
}

export async function updateChecklistItemAction(
  id: string,
  eventId: string,
  input: UpdateChecklistItemInput
): Promise<ActionResult<EventChecklistItemRow>> {
  const result = await runAction(() => eventService.updateChecklistItem(id, eventId, input));
  revalidateEvents(eventId);
  return result;
}

export async function removeChecklistItemAction(
  id: string,
  eventId: string
): Promise<ActionResult<void>> {
  const result = await runAction(() => eventService.removeChecklistItem(id, eventId));
  revalidateEvents(eventId);
  return result;
}

export async function listTimelineItemsAction(
  eventId: string
): Promise<ActionResult<EventTimelineItemRow[]>> {
  return runAction(() => eventService.listTimelineItems(eventId));
}

export async function addTimelineItemAction(
  eventId: string,
  input: CreateTimelineItemInput
): Promise<ActionResult<EventTimelineItemRow>> {
  const result = await runAction(() => eventService.addTimelineItem(eventId, input));
  revalidateEvents(eventId);
  return result;
}

export async function updateTimelineItemAction(
  id: string,
  eventId: string,
  input: UpdateTimelineItemInput
): Promise<ActionResult<EventTimelineItemRow>> {
  const result = await runAction(() => eventService.updateTimelineItem(id, eventId, input));
  revalidateEvents(eventId);
  return result;
}

export async function removeTimelineItemAction(
  id: string,
  eventId: string
): Promise<ActionResult<void>> {
  const result = await runAction(() => eventService.removeTimelineItem(id, eventId));
  revalidateEvents(eventId);
  return result;
}
