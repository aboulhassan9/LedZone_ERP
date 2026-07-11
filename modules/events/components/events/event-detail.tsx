"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { CheckCircle2, PlayCircle, XCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { EventStatusBadge } from "@/modules/events/components/status-badge";
import { EventFormDialog, type CustomerOption } from "@/modules/events/components/events/event-form-dialog";
import { ChecklistItemDialog } from "@/modules/events/components/events/checklist-item-dialog";
import { TimelineItemDialog } from "@/modules/events/components/events/timeline-item-dialog";
import { useAuth } from "@/providers/auth-provider";
import {
  setEventStatusAction,
  updateChecklistItemAction,
  removeChecklistItemAction,
  removeTimelineItemAction,
} from "@/modules/events/actions/event-actions";
import type { EventRow } from "@/modules/events/repositories/event-repository";
import type { EventChecklistItemRow } from "@/modules/events/repositories/event-checklist-repository";
import type { EventTimelineItemRow } from "@/modules/events/repositories/event-timeline-repository";

export function EventDetail({
  event,
  customerName,
  customers,
  checklistItems,
  timelineItems,
}: {
  event: EventRow;
  customerName: string | null;
  customers: CustomerOption[];
  checklistItems: EventChecklistItemRow[];
  timelineItems: EventTimelineItemRow[];
}) {
  const { hasPermission } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const canUpdate = hasPermission("events.manage") || hasPermission("events.update");
  const [editOpen, setEditOpen] = useState(false);

  function afterMutation() {
    queryClient.invalidateQueries({ queryKey: ["event", event.id] });
    router.refresh();
  }

  const setStatusMutation = useMutation({
    mutationFn: (status: "confirmed" | "in_progress" | "completed" | "cancelled") =>
      setEventStatusAction(event.id, { status }),
    onSuccess: (result) => {
      if (result.success) {
        toast.success("Event status updated");
        afterMutation();
      } else {
        toast.error(result.error.message);
      }
    },
  });

  const toggleChecklistMutation = useMutation({
    mutationFn: (item: EventChecklistItemRow) =>
      updateChecklistItemAction(item.id, event.id, { isDone: !item.is_done }),
    onSuccess: (result) => {
      if (result.success) afterMutation();
      else toast.error(result.error.message);
    },
  });

  const removeChecklistMutation = useMutation({
    mutationFn: (id: string) => removeChecklistItemAction(id, event.id),
    onSuccess: (result) => {
      if (result.success) afterMutation();
      else toast.error(result.error.message);
    },
  });

  const removeTimelineMutation = useMutation({
    mutationFn: (id: string) => removeTimelineItemAction(id, event.id),
    onSuccess: (result) => {
      if (result.success) afterMutation();
      else toast.error(result.error.message);
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            {event.name}
            <EventStatusBadge status={event.status} />
          </CardTitle>
          <div className="flex flex-wrap gap-2">
            {canUpdate && (
              <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
                Edit
              </Button>
            )}
            {canUpdate && event.status === "planning" && (
              <Button size="sm" disabled={setStatusMutation.isPending} onClick={() => setStatusMutation.mutate("confirmed")}>
                <CheckCircle2 /> Confirm
              </Button>
            )}
            {canUpdate && event.status === "confirmed" && (
              <Button size="sm" disabled={setStatusMutation.isPending} onClick={() => setStatusMutation.mutate("in_progress")}>
                <PlayCircle /> Start
              </Button>
            )}
            {canUpdate && event.status === "in_progress" && (
              <Button size="sm" disabled={setStatusMutation.isPending} onClick={() => setStatusMutation.mutate("completed")}>
                <CheckCircle2 /> Complete
              </Button>
            )}
            {canUpdate && !["completed", "cancelled"].includes(event.status) && (
              <Button
                size="sm"
                variant="outline"
                disabled={setStatusMutation.isPending}
                onClick={() => setStatusMutation.mutate("cancelled")}
              >
                <XCircle /> Cancel
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
            <div>
              <dt className="text-muted-foreground">Customer</dt>
              <dd className="font-medium">{customerName ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Venue</dt>
              <dd className="font-medium">{event.venue ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Start</dt>
              <dd className="font-medium">{new Date(event.event_start_at).toLocaleString()}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">End</dt>
              <dd className="font-medium">{new Date(event.event_end_at).toLocaleString()}</dd>
            </div>
          </dl>
          {event.notes && <p className="text-muted-foreground mt-4 text-sm">{event.notes}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base">Checklist</CardTitle>
          {canUpdate && <ChecklistItemDialog eventId={event.id} />}
        </CardHeader>
        <CardContent>
          {checklistItems.length === 0 ? (
            <p className="text-muted-foreground text-sm">No checklist items yet.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {checklistItems.map((item) => (
                <li key={item.id} className="flex items-center gap-3 rounded-md border p-2 text-sm">
                  <Checkbox
                    checked={item.is_done}
                    disabled={!canUpdate || toggleChecklistMutation.isPending}
                    onCheckedChange={() => toggleChecklistMutation.mutate(item)}
                  />
                  <div className="flex-1">
                    <p className={item.is_done ? "text-muted-foreground line-through" : "font-medium"}>
                      {item.title}
                    </p>
                    {item.due_at && (
                      <p className="text-muted-foreground text-xs">
                        Due {new Date(item.due_at).toLocaleString()}
                      </p>
                    )}
                  </div>
                  {canUpdate && (
                    <Button
                      size="icon"
                      variant="ghost"
                      disabled={removeChecklistMutation.isPending}
                      onClick={() => removeChecklistMutation.mutate(item.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base">Timeline</CardTitle>
          {canUpdate && <TimelineItemDialog eventId={event.id} />}
        </CardHeader>
        <CardContent>
          {timelineItems.length === 0 ? (
            <p className="text-muted-foreground text-sm">No timeline beats yet.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {timelineItems.map((item) => (
                <li key={item.id} className="flex items-center gap-3 rounded-md border p-2 text-sm">
                  <div className="flex-1">
                    <p className="font-medium">{item.title}</p>
                    <p className="text-muted-foreground text-xs">
                      {new Date(item.scheduled_at).toLocaleString()}
                      {item.duration_minutes ? ` — ${item.duration_minutes} min` : ""}
                    </p>
                  </div>
                  {canUpdate && (
                    <Button
                      size="icon"
                      variant="ghost"
                      disabled={removeTimelineMutation.isPending}
                      onClick={() => removeTimelineMutation.mutate(item.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <EventFormDialog event={event} customers={customers} open={editOpen} onOpenChange={setEditOpen} />
    </div>
  );
}
