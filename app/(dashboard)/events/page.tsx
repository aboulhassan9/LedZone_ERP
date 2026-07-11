import { requirePermission, hasPermission } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { EventTable } from "@/modules/events/components/events/event-table";
import { EventFormDialog } from "@/modules/events/components/events/event-form-dialog";
import type { EventRow } from "@/modules/events/repositories/event-repository";

export default async function EventsPage() {
  await requirePermission("events.view");

  const supabase = await createClient();
  const [{ data: events }, { data: customers }, canCreate] = await Promise.all([
    supabase
      .from("events")
      .select("id, name, customer_id, venue, event_start_at, event_end_at, status, notes, created_at, updated_at")
      .is("deleted_at", null)
      .order("event_start_at", { ascending: false }),
    supabase.from("customers").select("id, company_name, full_name").is("deleted_at", null).order("company_name"),
    hasPermission("events.manage").then((v) => v || hasPermission("events.create")),
  ]);

  const customerRows = customers ?? [];
  const customerNames = Object.fromEntries(
    customerRows.map((c) => [c.id, c.company_name ?? c.full_name ?? "—"])
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Events</h1>
          <p className="text-muted-foreground text-sm">The client/project record — checklists and timeline live inside each one.</p>
        </div>
        {canCreate && (
          <EventFormDialog
            customers={customerRows.map((c) => ({ id: c.id, label: c.company_name ?? c.full_name ?? "—" }))}
          />
        )}
      </div>
      <EventTable events={(events ?? []) as EventRow[]} customerNames={customerNames} />
    </div>
  );
}
