"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/providers/auth-provider";
import { CrewMemberFormDialog } from "@/modules/planning/components/crew/crew-form-dialog";
import type { CrewMemberRow } from "@/modules/planning/repositories/resource-assignment-repository";

export function CrewTable({ crewMembers }: { crewMembers: CrewMemberRow[] }) {
  const { hasPermission } = useAuth();
  const canManage = hasPermission("planning.manage") || hasPermission("planning.assign.crew");
  const [editing, setEditing] = useState<CrewMemberRow | null>(null);

  const columns = useMemo<ColumnDef<CrewMemberRow>[]>(
    () => [
      {
        accessorKey: "full_name",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
        cell: ({ row }) => <span className="font-medium">{row.original.full_name}</span>,
      },
      { accessorKey: "role", header: "Role", cell: ({ row }) => row.original.role ?? "—" },
      { accessorKey: "phone", header: "Phone", cell: ({ row }) => row.original.phone ?? "—" },
      { accessorKey: "email", header: "Email", cell: ({ row }) => row.original.email ?? "—" },
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
              cell: ({ row }: { row: { original: CrewMemberRow } }) => (
                <Button size="sm" variant="ghost" onClick={() => setEditing(row.original)}>
                  Edit
                </Button>
              ),
            } satisfies ColumnDef<CrewMemberRow>,
          ]
        : []),
    ],
    [canManage]
  );

  return (
    <>
      <DataTable columns={columns} data={crewMembers} searchKey="full_name" searchPlaceholder="Search crew..." />
      {editing && (
        <CrewMemberFormDialog crewMember={editing} open={!!editing} onOpenChange={(open) => !open && setEditing(null)} />
      )}
    </>
  );
}
