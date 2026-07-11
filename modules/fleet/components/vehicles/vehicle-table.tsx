"use client";

import { useMemo } from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { FleetStatusBadge } from "@/modules/fleet/components/status-badge";
import type { VehicleRow } from "@/modules/fleet/repositories/vehicle-repository";

export function FleetVehicleTable({ vehicles }: { vehicles: VehicleRow[] }) {
  const columns = useMemo<ColumnDef<VehicleRow>[]>(
    () => [
      {
        accessorKey: "name",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Vehicle" />,
        cell: ({ row }) => (
          <Link href={`/fleet/${row.original.id}`} className="font-medium hover:underline">
            {row.original.name}
          </Link>
        ),
      },
      {
        id: "make_model",
        header: "Make / model",
        accessorFn: (row) => [row.make, row.model].filter(Boolean).join(" ") || "—",
      },
      { accessorKey: "plate_number", header: "Plate", cell: ({ row }) => row.original.plate_number ?? "—" },
      {
        accessorKey: "odometer_km",
        header: "Odometer",
        cell: ({ row }) => (row.original.odometer_km != null ? `${row.original.odometer_km.toLocaleString()} km` : "—"),
      },
      {
        accessorKey: "fleet_status",
        header: "Status",
        cell: ({ row }) => <FleetStatusBadge status={row.original.fleet_status} />,
      },
    ],
    []
  );

  return <DataTable columns={columns} data={vehicles} searchKey="name" searchPlaceholder="Search vehicles..." />;
}
