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
import { ManufacturerFormDialog } from "@/modules/inventory/components/reference-data/manufacturer-form-dialog";
import { archiveManufacturerAction } from "@/modules/inventory/actions/reference-data-actions";
import type { ManufacturerRow } from "@/modules/inventory/repositories/manufacturer-repository";

export function ManufacturerTable({ manufacturers }: { manufacturers: ManufacturerRow[] }) {
  const { hasPermission } = useAuth();
  const canManage = hasPermission("inventory.manage");
  const [editing, setEditing] = useState<ManufacturerRow | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleArchive(id: string) {
    startTransition(async () => {
      const result = await archiveManufacturerAction(id);
      if (result.success) toast.success("Manufacturer archived");
      else toast.error(result.error.message);
    });
  }

  const columns = useMemo<ColumnDef<ManufacturerRow>[]>(
    () => [
      {
        accessorKey: "name",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
        cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
      },
      { accessorKey: "country", header: "Country", cell: ({ row }) => row.original.country ?? "—" },
      {
        accessorKey: "website",
        header: "Website",
        cell: ({ row }) => row.original.website ?? "—",
      },
      { accessorKey: "status", header: "Status", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
      ...(canManage
        ? [
            {
              id: "actions",
              cell: ({ row }: { row: { original: ManufacturerRow } }) => (
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
            } satisfies ColumnDef<ManufacturerRow>,
          ]
        : []),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [manufacturers, canManage, isPending]
  );

  return (
    <>
      <DataTable columns={columns} data={manufacturers} searchKey="name" searchPlaceholder="Search manufacturers..." />
      {editing && (
        <ManufacturerFormDialog
          manufacturer={editing}
          open={!!editing}
          onOpenChange={(open) => !open && setEditing(null)}
        />
      )}
    </>
  );
}
