"use client";

import { useMemo } from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { EventStatusBadge } from "@/modules/events/components/status-badge";
import type { EventRow } from "@/modules/events/repositories/event-repository";

export function EventTable({
  events,
  customerNames,
}: {
  events: EventRow[];
  customerNames: Record<string, string>;
}) {
  const columns = useMemo<ColumnDef<EventRow>[]>(
    () => [
      {
        accessorKey: "name",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Event" />,
        cell: ({ row }) => (
          <Link href={`/events/${row.original.id}`} className="font-medium hover:underline">
            {row.original.name}
          </Link>
        ),
      },
      {
        id: "window",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Window" />,
        accessorFn: (row) => row.event_start_at,
        cell: ({ row }) => (
          <span className="text-sm">
            {new Date(row.original.event_start_at).toLocaleDateString()} –{" "}
            {new Date(row.original.event_end_at).toLocaleDateString()}
          </span>
        ),
      },
      {
        id: "customer",
        header: "Customer",
        accessorFn: (row) => (row.customer_id ? customerNames[row.customer_id] ?? "—" : "—"),
      },
      { accessorKey: "venue", header: "Venue", cell: ({ row }) => row.original.venue ?? "—" },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <EventStatusBadge status={row.original.status} />,
      },
    ],
    [customerNames]
  );

  return <DataTable columns={columns} data={events} searchKey="name" searchPlaceholder="Search events..." />;
}
