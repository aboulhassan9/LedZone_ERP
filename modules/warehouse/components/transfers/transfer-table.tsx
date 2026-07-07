"use client";

import { useMemo } from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { WarehouseStatusBadge } from "@/modules/warehouse/components/status-badge";
import type { WarehouseTransferRow } from "@/modules/warehouse/repositories/warehouse-transfer-repository";

export function TransferTable({
  transfers,
  warehouseNames,
}: {
  transfers: WarehouseTransferRow[];
  warehouseNames: Record<string, string>;
}) {
  const columns = useMemo<ColumnDef<WarehouseTransferRow>[]>(
    () => [
      {
        id: "route",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Route" />,
        accessorFn: (row) => `${warehouseNames[row.from_warehouse_id] ?? "—"} → ${warehouseNames[row.to_warehouse_id] ?? "—"}`,
        cell: ({ row }) => (
          <Link href={`/warehouse/transfers/${row.original.id}`} className="font-medium hover:underline">
            {warehouseNames[row.original.from_warehouse_id] ?? "—"} →{" "}
            {warehouseNames[row.original.to_warehouse_id] ?? "—"}
          </Link>
        ),
      },
      {
        accessorKey: "requested_at",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Requested" />,
        cell: ({ row }) => new Date(row.original.requested_at).toLocaleDateString(),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <WarehouseStatusBadge status={row.original.status} />,
      },
      { accessorKey: "notes", header: "Notes", cell: ({ row }) => row.original.notes ?? "—" },
    ],
    [warehouseNames]
  );

  return (
    <DataTable columns={columns} data={transfers} searchKey="route" searchPlaceholder="Search transfers..." />
  );
}
