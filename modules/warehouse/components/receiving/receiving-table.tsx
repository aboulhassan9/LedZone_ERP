"use client";

import { useMemo } from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { WarehouseStatusBadge } from "@/modules/warehouse/components/status-badge";
import type { WarehouseReceivingRow } from "@/modules/warehouse/repositories/warehouse-receiving-repository";

export function ReceivingTable({
  records,
  warehouseNames,
}: {
  records: WarehouseReceivingRow[];
  warehouseNames: Record<string, string>;
}) {
  const columns = useMemo<ColumnDef<WarehouseReceivingRow>[]>(
    () => [
      {
        id: "warehouse",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Warehouse" />,
        accessorFn: (row) => warehouseNames[row.warehouse_id] ?? "—",
        cell: ({ row }) => (
          <Link href={`/warehouse/receiving/${row.original.id}`} className="font-medium hover:underline">
            {warehouseNames[row.original.warehouse_id] ?? "—"}
          </Link>
        ),
      },
      {
        accessorKey: "source_type",
        header: "Source",
        cell: ({ row }) => <span className="capitalize">{row.original.source_type.replace(/_/g, " ")}</span>,
      },
      {
        accessorKey: "received_at",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Received" />,
        cell: ({ row }) => new Date(row.original.received_at).toLocaleDateString(),
      },
      { accessorKey: "status", header: "Status", cell: ({ row }) => <WarehouseStatusBadge status={row.original.status} /> },
    ],
    [warehouseNames]
  );

  return <DataTable columns={columns} data={records} searchKey="warehouse" searchPlaceholder="Search receiving..." />;
}
