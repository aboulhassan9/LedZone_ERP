"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/providers/auth-provider";
import { VehicleFormDialog } from "@/modules/planning/components/vehicles/vehicle-form-dialog";
import type { VehicleRow } from "@/modules/planning/repositories/resource-assignment-repository";

export function VehicleTable({ vehicles }: { vehicles: VehicleRow[] }) {
  const { hasPermission } = useAuth();
  const canManage = hasPermission("planning.manage") || hasPermission("planning.assign.vehicle");
  const [editing, setEditing] = useState<VehicleRow | null>(null);

  const columns = useMemo<ColumnDef<VehicleRow>[]>(
    () => [
      {
        accessorKey: "name",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
        cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
      },
      { accessorKey: "plate_number", header: "Plate", cell: ({ row }) => row.original.plate_number ?? "—" },
      { accessorKey: "vehicle_type", header: "Type", cell: ({ row }) => row.original.vehicle_type ?? "—" },
      { accessorKey: "capacity_notes", header: "Capacity", cell: ({ row }) => row.original.capacity_notes ?? "—" },
      {
        accessorKey: "is_active",
        header: "Status",
        cell: ({ row }) => (
          <Badge variant={row.original.is_active ? "outline" : "secondary"}>
            {row.original.is_active ? "Active" : "Inactive"}
          </Badge>
        ),
      },
      ...(canManage
        ? [
            {
              id: "actions",
              cell: ({ row }: { row: { original: VehicleRow } }) => (
                <Button size="sm" variant="ghost" onClick={() => setEditing(row.original)}>
                  Edit
                </Button>
              ),
            } satisfies ColumnDef<VehicleRow>,
          ]
        : []),
    ],
    [canManage]
  );

  return (
    <>
      <DataTable columns={columns} data={vehicles} searchKey="name" searchPlaceholder="Search vehicles..." />
      {editing && (
        <VehicleFormDialog vehicle={editing} open={!!editing} onOpenChange={(open) => !open && setEditing(null)} />
      )}
    </>
  );
}
