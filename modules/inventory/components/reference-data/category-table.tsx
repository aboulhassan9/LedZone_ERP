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
import { CategoryFormDialog } from "@/modules/inventory/components/reference-data/category-form-dialog";
import { archiveEquipmentCategoryAction } from "@/modules/inventory/actions/reference-data-actions";
import type { EquipmentCategoryRow } from "@/modules/inventory/repositories/equipment-category-repository";

export function CategoryTable({ categories }: { categories: EquipmentCategoryRow[] }) {
  const { hasPermission } = useAuth();
  const canManage = hasPermission("inventory.manage");
  const [editing, setEditing] = useState<EquipmentCategoryRow | null>(null);
  const [isPending, startTransition] = useTransition();

  const parentName = (id: string | null) => categories.find((c) => c.id === id)?.name ?? "—";

  function handleArchive(id: string) {
    startTransition(async () => {
      const result = await archiveEquipmentCategoryAction(id);
      if (result.success) toast.success("Category archived");
      else toast.error(result.error.message);
    });
  }

  const columns = useMemo<ColumnDef<EquipmentCategoryRow>[]>(
    () => [
      {
        accessorKey: "name",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
        cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
      },
      {
        id: "parent",
        header: "Parent",
        cell: ({ row }) => parentName(row.original.parent_id),
      },
      {
        accessorKey: "description",
        header: "Description",
        cell: ({ row }) => (
          <span className="text-muted-foreground">{row.original.description ?? "—"}</span>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      ...(canManage
        ? [
            {
              id: "actions",
              cell: ({ row }: { row: { original: EquipmentCategoryRow } }) => (
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
            } satisfies ColumnDef<EquipmentCategoryRow>,
          ]
        : []),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [categories, canManage, isPending]
  );

  return (
    <>
      <DataTable columns={columns} data={categories} searchKey="name" searchPlaceholder="Search categories..." />
      {editing && (
        <CategoryFormDialog
          category={editing}
          categories={categories}
          open={!!editing}
          onOpenChange={(open) => !open && setEditing(null)}
        />
      )}
    </>
  );
}
