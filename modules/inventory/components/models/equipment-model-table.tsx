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
import { EquipmentModelFormDialog } from "@/modules/inventory/components/models/equipment-model-form-dialog";
import { archiveEquipmentModelAction } from "@/modules/inventory/actions/equipment-model-actions";
import type { EquipmentModelRow } from "@/modules/inventory/repositories/equipment-model-repository";
import type { EquipmentCategoryRow } from "@/modules/inventory/repositories/equipment-category-repository";
import type { ManufacturerRow } from "@/modules/inventory/repositories/manufacturer-repository";
import type { BrandRow } from "@/modules/inventory/repositories/brand-repository";

export function EquipmentModelTable({
  models,
  categories,
  manufacturers,
  brands,
}: {
  models: EquipmentModelRow[];
  categories: EquipmentCategoryRow[];
  manufacturers: ManufacturerRow[];
  brands: BrandRow[];
}) {
  const { hasPermission } = useAuth();
  const canManage = hasPermission("inventory.manage");
  const [editing, setEditing] = useState<EquipmentModelRow | null>(null);
  const [isPending, startTransition] = useTransition();

  const categoryName = (id: string) => categories.find((c) => c.id === id)?.name ?? "—";
  const manufacturerName = (id: string) => manufacturers.find((m) => m.id === id)?.name ?? "—";

  function handleArchive(id: string) {
    startTransition(async () => {
      const result = await archiveEquipmentModelAction(id);
      if (result.success) toast.success("Model archived");
      else toast.error(result.error.message);
    });
  }

  const columns = useMemo<ColumnDef<EquipmentModelRow>[]>(
    () => [
      {
        accessorKey: "model_name",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Model" />,
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="font-medium">{row.original.model_name}</span>
            {row.original.model_number && (
              <span className="text-muted-foreground text-xs">{row.original.model_number}</span>
            )}
          </div>
        ),
      },
      { id: "category", header: "Category", cell: ({ row }) => categoryName(row.original.category_id) },
      {
        id: "manufacturer",
        header: "Manufacturer",
        cell: ({ row }) => manufacturerName(row.original.manufacturer_id),
      },
      { accessorKey: "status", header: "Status", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
      ...(canManage
        ? [
            {
              id: "actions",
              cell: ({ row }: { row: { original: EquipmentModelRow } }) => (
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
            } satisfies ColumnDef<EquipmentModelRow>,
          ]
        : []),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [models, categories, manufacturers, canManage, isPending]
  );

  return (
    <>
      <DataTable columns={columns} data={models} searchKey="model_name" searchPlaceholder="Search models..." />
      {editing && (
        <EquipmentModelFormDialog
          model={editing}
          categories={categories}
          manufacturers={manufacturers}
          brands={brands}
          open={!!editing}
          onOpenChange={(open) => !open && setEditing(null)}
        />
      )}
    </>
  );
}
