import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { EventDetail } from "@/modules/events/components/events/event-detail";
import type { EventRow } from "@/modules/events/repositories/event-repository";
import type { EventChecklistItemRow } from "@/modules/events/repositories/event-checklist-repository";
import type { EventTimelineItemRow } from "@/modules/events/repositories/event-timeline-repository";

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("events.view");
  const { id } = await params;

  const supabase = await createClient();
  const { data: event } = await supabase
    .from("events")
    .select("id, name, customer_id, venue, event_start_at, event_end_at, status, notes, created_at, updated_at")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (!event) notFound();
  const eventRow = event as EventRow;

  const [{ data: checklistItems }, { data: timelineItems }, { data: customers }, { data: customer }] =
    await Promise.all([
      supabase
        .from("event_checklist_items")
        .select("id, event_id, title, is_done, due_at, assigned_to, notes, sequence")
        .eq("event_id", id)
        .order("sequence", { ascending: true }),
      supabase
        .from("event_timeline_items")
        .select("id, event_id, title, scheduled_at, duration_minutes, notes, sequence")
        .eq("event_id", id)
        .order("scheduled_at", { ascending: true }),
      supabase.from("customers").select("id, company_name, full_name").is("deleted_at", null).order("company_name"),
      eventRow.customer_id
        ? supabase.from("customers").select("id, company_name, full_name").eq("id", eventRow.customer_id).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

  const customerName = customer?.company_name ?? customer?.full_name ?? null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Event</h1>
        <p className="text-muted-foreground text-sm">Planning → Confirmed → In progress → Completed.</p>
      </div>
      <EventDetail
        event={eventRow}
        customerName={customerName}
        customers={(customers ?? []).map((c) => ({ id: c.id, label: c.company_name ?? c.full_name ?? "—" }))}
        checklistItems={(checklistItems ?? []) as EventChecklistItemRow[]}
        timelineItems={(timelineItems ?? []) as EventTimelineItemRow[]}
      />
    </div>
  );
}
