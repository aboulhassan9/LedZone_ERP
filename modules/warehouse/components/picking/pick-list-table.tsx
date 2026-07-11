"use client";

import { useMemo } from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { WarehouseStatusBadge } from "@/modules/warehouse/components/status-badge";
import type { WarehousePickListRow } from "@/modules/warehouse/repositories/warehouse-picking-repository";

export function PickListTable({
  pickLists,
  warehouseNames,
}: {
  pickLists: WarehousePickListRow[];
  warehouseNames: Record<string, string>;
}) {
  const columns = useMemo<ColumnDef<WarehousePickListRow>[]>(
    () => [
      {
        id: "warehouse",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Warehouse" />,
        accessorFn: (row) => warehouseNames[row.warehouse_id] ?? "—",
        cell: ({ row }) => (
          <Link href={`/warehouse/picking/${row.original.id}`} className="font-medium hover:underline">
            {warehouseNames[row.original.warehouse_id] ?? "—"}
          </Link>
        ),
      },
      {
        accessorKey: "method",
        header: "Method",
        cell: ({ row }) => <span className="capitalize">{row.original.method}</span>,
      },
      { accessorKey: "status", header: "Status", cell: ({ row }) => <WarehouseStatusBadge status={row.original.status} /> },
    ],
    [warehouseNames]
  );

  return <DataTable columns={columns} data={pickLists} searchKey="warehouse" searchPlaceholder="Search pick lists..." />;
}
