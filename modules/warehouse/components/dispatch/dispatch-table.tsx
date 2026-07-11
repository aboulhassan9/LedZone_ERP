"use client";

import { useMemo } from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { WarehouseStatusBadge } from "@/modules/warehouse/components/status-badge";
import type { WarehouseDispatchRow } from "@/modules/warehouse/repositories/warehouse-dispatch-repository";

export function DispatchTable({
  records,
  warehouseNames,
}: {
  records: WarehouseDispatchRow[];
  warehouseNames: Record<string, string>;
}) {
  const columns = useMemo<ColumnDef<WarehouseDispatchRow>[]>(
    () => [
      {
        id: "warehouse",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Warehouse" />,
        accessorFn: (row) => warehouseNames[row.warehouse_id] ?? "—",
        cell: ({ row }) => (
          <Link href={`/warehouse/dispatch/${row.original.id}`} className="font-medium hover:underline">
            {warehouseNames[row.original.warehouse_id] ?? "—"}
          </Link>
        ),
      },
      {
        accessorKey: "destination_type",
        header: "Destination",
        cell: ({ row }) => <span className="capitalize">{row.original.destination_type.replace(/_/g, " ")}</span>,
      },
      {
        accessorKey: "destination_reference",
        header: "Reference",
        cell: ({ row }) => row.original.destination_reference ?? "—",
      },
      { accessorKey: "status", header: "Status", cell: ({ row }) => <WarehouseStatusBadge status={row.original.status} /> },
    ],
    [warehouseNames]
  );

  return <DataTable columns={columns} data={records} searchKey="warehouse" searchPlaceholder="Search dispatch..." />;
}
