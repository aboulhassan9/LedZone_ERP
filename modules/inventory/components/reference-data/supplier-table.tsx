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
import { SupplierFormDialog } from "@/modules/inventory/components/reference-data/supplier-form-dialog";
import { archiveSupplierAction } from "@/modules/inventory/actions/reference-data-actions";
import type { SupplierRow } from "@/modules/inventory/repositories/supplier-repository";

export function SupplierTable({
  suppliers,
  currencies,
}: {
  suppliers: SupplierRow[];
  currencies: { code: string; name: string }[];
}) {
  const { hasPermission } = useAuth();
  const canManage = hasPermission("inventory.manage");
  const [editing, setEditing] = useState<SupplierRow | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleArchive(id: string) {
    startTransition(async () => {
      const result = await archiveSupplierAction(id);
      if (result.success) toast.success("Supplier archived");
      else toast.error(result.error.message);
    });
  }

  const columns = useMemo<ColumnDef<SupplierRow>[]>(
    () => [
      {
        accessorKey: "name",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
        cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
      },
      { accessorKey: "contact_name", header: "Contact", cell: ({ row }) => row.original.contact_name ?? "—" },
      { accessorKey: "email", header: "Email", cell: ({ row }) => row.original.email ?? "—" },
      { accessorKey: "country", header: "Country", cell: ({ row }) => row.original.country ?? "—" },
      { accessorKey: "status", header: "Status", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
      ...(canManage
        ? [
            {
              id: "actions",
              cell: ({ row }: { row: { original: SupplierRow } }) => (
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
            } satisfies ColumnDef<SupplierRow>,
          ]
        : []),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [suppliers, canManage, isPending]
  );

  return (
    <>
      <DataTable columns={columns} data={suppliers} searchKey="name" searchPlaceholder="Search suppliers..." />
      {editing && (
        <SupplierFormDialog
          supplier={editing}
          currencies={currencies}
          open={!!editing}
          onOpenChange={(open) => !open && setEditing(null)}
        />
      )}
    </>
  );
}
