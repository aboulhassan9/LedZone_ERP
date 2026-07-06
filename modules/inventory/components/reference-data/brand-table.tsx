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
import { BrandFormDialog } from "@/modules/inventory/components/reference-data/brand-form-dialog";
import { archiveBrandAction } from "@/modules/inventory/actions/reference-data-actions";
import type { BrandRow } from "@/modules/inventory/repositories/brand-repository";
import type { ManufacturerRow } from "@/modules/inventory/repositories/manufacturer-repository";

export function BrandTable({
  brands,
  manufacturers,
}: {
  brands: BrandRow[];
  manufacturers: ManufacturerRow[];
}) {
  const { hasPermission } = useAuth();
  const canManage = hasPermission("inventory.manage");
  const [editing, setEditing] = useState<BrandRow | null>(null);
  const [isPending, startTransition] = useTransition();

  const manufacturerName = (id: string | null) =>
    manufacturers.find((m) => m.id === id)?.name ?? "—";

  function handleArchive(id: string) {
    startTransition(async () => {
      const result = await archiveBrandAction(id);
      if (result.success) toast.success("Brand archived");
      else toast.error(result.error.message);
    });
  }

  const columns = useMemo<ColumnDef<BrandRow>[]>(
    () => [
      {
        accessorKey: "name",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
        cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
      },
      {
        id: "manufacturer",
        header: "Manufacturer",
        cell: ({ row }) => manufacturerName(row.original.manufacturer_id),
      },
      { accessorKey: "website", header: "Website", cell: ({ row }) => row.original.website ?? "—" },
      { accessorKey: "status", header: "Status", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
      ...(canManage
        ? [
            {
              id: "actions",
              cell: ({ row }: { row: { original: BrandRow } }) => (
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
            } satisfies ColumnDef<BrandRow>,
          ]
        : []),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [brands, manufacturers, canManage, isPending]
  );

  return (
    <>
      <DataTable columns={columns} data={brands} searchKey="name" searchPlaceholder="Search brands..." />
      {editing && (
        <BrandFormDialog
          brand={editing}
          manufacturers={manufacturers}
          open={!!editing}
          onOpenChange={(open) => !open && setEditing(null)}
        />
      )}
    </>
  );
}
