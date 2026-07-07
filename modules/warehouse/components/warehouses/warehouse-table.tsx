"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import type { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { WarehouseStatusBadge } from "@/modules/warehouse/components/status-badge";
import { useAuth } from "@/providers/auth-provider";
import { WarehouseFormDialog } from "@/modules/warehouse/components/warehouses/warehouse-form-dialog";
import { archiveWarehouseAction, setDefaultWarehouseAction } from "@/modules/warehouse/actions/warehouse-actions";
import type { WarehouseRow } from "@/modules/warehouse/repositories/warehouse-repository";

export function WarehouseTable({
  warehouses,
  locations,
  profiles,
}: {
  warehouses: WarehouseRow[];
  locations: { id: string; name: string }[];
  profiles: { id: string; full_name: string }[];
}) {
  const { hasPermission } = useAuth();
  const canManage = hasPermission("warehouse.manage") || hasPermission("warehouse.update");
  const canDelete = hasPermission("warehouse.manage") || hasPermission("warehouse.delete");
  const [editing, setEditing] = useState<WarehouseRow | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleArchive(id: string) {
    startTransition(async () => {
      const result = await archiveWarehouseAction(id);
      if (result.success) toast.success("Warehouse archived");
      else toast.error(result.error.message);
    });
  }

  function handleSetDefault(id: string) {
    startTransition(async () => {
      const result = await setDefaultWarehouseAction(id);
      if (result.success) toast.success("Default warehouse updated");
      else toast.error(result.error.message);
    });
  }

  const columns = useMemo<ColumnDef<WarehouseRow>[]>(
    () => [
      {
        accessorKey: "name",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <Link href={`/warehouse/warehouses/${row.original.id}`} className="font-medium hover:underline">
              {row.original.name}
            </Link>
            {row.original.is_default && (
              <Badge variant="outline" className="gap-1">
                <Star className="size-3 fill-current" />
                Default
              </Badge>
            )}
          </div>
        ),
      },
      { accessorKey: "code", header: "Code" },
      {
        accessorKey: "warehouse_type",
        header: "Type",
        cell: ({ row }) => <span className="capitalize">{row.original.warehouse_type.replace(/_/g, " ")}</span>,
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <WarehouseStatusBadge status={row.original.status} />,
      },
      ...(canManage || canDelete
        ? [
            {
              id: "actions",
              cell: ({ row }: { row: { original: WarehouseRow } }) => (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="size-8">
                      <MoreHorizontal />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {canManage && (
                      <DropdownMenuItem onSelect={() => setEditing(row.original)}>Edit</DropdownMenuItem>
                    )}
                    {canManage && !row.original.is_default && (
                      <DropdownMenuItem disabled={isPending} onSelect={() => handleSetDefault(row.original.id)}>
                        Set as default
                      </DropdownMenuItem>
                    )}
                    {canDelete && (
                      <DropdownMenuItem
                        variant="destructive"
                        disabled={isPending}
                        onSelect={() => handleArchive(row.original.id)}
                      >
                        Archive
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              ),
            } satisfies ColumnDef<WarehouseRow>,
          ]
        : []),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [warehouses, canManage, canDelete, isPending]
  );

  return (
    <>
      <DataTable columns={columns} data={warehouses} searchKey="name" searchPlaceholder="Search warehouses..." />
      {editing && (
        <WarehouseFormDialog
          warehouse={editing}
          locations={locations}
          profiles={profiles}
          open={!!editing}
          onOpenChange={(open) => !open && setEditing(null)}
        />
      )}
    </>
  );
}
