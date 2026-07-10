"use client";

import { useMemo } from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { PlanStatusBadge } from "@/modules/planning/components/status-badge";
import type { EquipmentPlanRow } from "@/modules/planning/repositories/equipment-plan-repository";

export function PlanTable({
  plans,
  warehouseNames,
}: {
  plans: EquipmentPlanRow[];
  warehouseNames: Record<string, string>;
}) {
  const columns = useMemo<ColumnDef<EquipmentPlanRow>[]>(
    () => [
      {
        accessorKey: "name",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Plan" />,
        cell: ({ row }) => (
          <Link href={`/planning/plans/${row.original.id}`} className="font-medium hover:underline">
            {row.original.name}
          </Link>
        ),
      },
      {
        id: "event_window",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Event window" />,
        accessorFn: (row) => row.event_start_at,
        cell: ({ row }) => (
          <span className="text-sm">
            {new Date(row.original.event_start_at).toLocaleDateString()} –{" "}
            {new Date(row.original.event_end_at).toLocaleDateString()}
          </span>
        ),
      },
      {
        id: "warehouse",
        header: "Warehouse",
        accessorFn: (row) => (row.primary_warehouse_id ? warehouseNames[row.primary_warehouse_id] ?? "—" : "Any"),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <PlanStatusBadge status={row.original.status} />,
      },
      {
        accessorKey: "customer_reference",
        header: "Customer",
        cell: ({ row }) => row.original.customer_reference ?? "—",
      },
    ],
    [warehouseNames]
  );

  return <DataTable columns={columns} data={plans} searchKey="name" searchPlaceholder="Search plans..." />;
}
