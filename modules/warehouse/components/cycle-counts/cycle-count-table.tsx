"use client";

import { useMemo } from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { WarehouseStatusBadge } from "@/modules/warehouse/components/status-badge";
import type { WarehouseCycleCountRow } from "@/modules/warehouse/repositories/warehouse-cycle-count-repository";

export function CycleCountTable({
  cycleCounts,
  warehouseNames,
}: {
  cycleCounts: WarehouseCycleCountRow[];
  warehouseNames: Record<string, string>;
}) {
  const columns = useMemo<ColumnDef<WarehouseCycleCountRow>[]>(
    () => [
      {
        id: "warehouse",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Warehouse" />,
        accessorFn: (row) => warehouseNames[row.warehouse_id] ?? "—",
        cell: ({ row }) => (
          <Link href={`/warehouse/cycle-counts/${row.original.id}`} className="font-medium hover:underline">
            {warehouseNames[row.original.warehouse_id] ?? "—"}
          </Link>
        ),
      },
      {
        accessorKey: "scope_type",
        header: "Scope",
        cell: ({ row }) => <span className="capitalize">{row.original.scope_type}</span>,
      },
      {
        accessorKey: "scheduled_date",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Scheduled" />,
        cell: ({ row }) => (row.original.scheduled_date ? new Date(row.original.scheduled_date).toLocaleDateString() : "—"),
      },
      { accessorKey: "status", header: "Status", cell: ({ row }) => <WarehouseStatusBadge status={row.original.status} /> },
    ],
    [warehouseNames]
  );

  return <DataTable columns={columns} data={cycleCounts} searchKey="warehouse" searchPlaceholder="Search cycle counts..." />;
}
