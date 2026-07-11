"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import type { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { StatusBadge } from "@/modules/inventory/components/status-badge";
import { useAuth } from "@/providers/auth-provider";
import { StorageLocationFormDialog } from "@/modules/inventory/components/reference-data/storage-location-form-dialog";
import { archiveStorageLocationAction } from "@/modules/inventory/actions/reference-data-actions";
import type { StorageLocationRow } from "@/modules/inventory/repositories/storage-location-repository";

export function StorageLocationTable({
  storageLocations,
  locations,
}: {
  storageLocations: StorageLocationRow[];
  locations: { id: string; name: string }[];
}) {
  const { hasPermission } = useAuth();
  const canManage = hasPermission("inventory.manage");
  const [editing, setEditing] = useState<StorageLocationRow | null>(null);
  const [isPending, startTransition] = useTransition();

  const locationName = (id: string) => locations.find((l) => l.id === id)?.name ?? "—";

  function handleArchive(id: string) {
    startTransition(async () => {
      const result = await archiveStorageLocationAction(id);
      if (result.success) toast.success("Storage location archived");
      else toast.error(result.error.message);
    });
  }

  const columns = useMemo<ColumnDef<StorageLocationRow>[]>(
    () => [
      {
        accessorKey: "name",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
        cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
      },
      { id: "site", header: "Site", cell: ({ row }) => locationName(row.original.location_id) },
      { accessorKey: "code", header: "Code", cell: ({ row }) => row.original.code ?? "—" },
      { accessorKey: "status", header: "Status", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
      ...(canManage
        ? [
            {
              id: "actions",
              cell: ({ row }: { row: { original: StorageLocationRow } }) => (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="size-8">
                      <MoreHorizontal />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => setEditing(row.original)}>Edit</DropdownMenuItem>
                    <DropdownMenuItem
                      variant="destructive"
                      disabled={isPending}
                      onSelect={() => handleArchive(row.original.id)}
                    >
                      Archive
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ),
            } satisfies ColumnDef<StorageLocationRow>,
          ]
        : []),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [storageLocations, locations, canManage, isPending]
  );

  return (
    <>
      <DataTable
        columns={columns}
        data={storageLocations}
        searchKey="name"
        searchPlaceholder="Search storage locations..."
      />
      {editing && (
        <StorageLocationFormDialog
          storageLocation={editing}
          locations={locations}
          open={!!editing}
          onOpenChange={(open) => !open && setEditing(null)}
        />
      )}
    </>
  );
}
