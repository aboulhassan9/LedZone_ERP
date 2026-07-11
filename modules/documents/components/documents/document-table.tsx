"use client";

import { useMemo } from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { DocumentStatusBadge } from "@/modules/documents/components/status-badge";
import type { DocumentRow } from "@/modules/documents/repositories/document-repository";

export function DocumentTable({ documents }: { documents: DocumentRow[] }) {
  const columns = useMemo<ColumnDef<DocumentRow>[]>(
    () => [
      {
        accessorKey: "name",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
        cell: ({ row }) => (
          <Link href={`/documents/${row.original.id}`} className="font-medium hover:underline">
            {row.original.name}
          </Link>
        ),
      },
      {
        accessorKey: "document_type",
        header: "Type",
        cell: ({ row }) => <span className="capitalize">{row.original.document_type.replace(/_/g, " ")}</span>,
      },
      {
        id: "attached_to",
        header: "Attached to",
        accessorFn: (row) => (row.entity_type ? row.entity_type.replace(/_/g, " ") : "—"),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <DocumentStatusBadge status={row.original.status} />,
      },
      {
        accessorKey: "created_at",
        header: "Created",
        cell: ({ row }) => new Date(row.original.created_at).toLocaleDateString(),
      },
    ],
    []
  );

  return <DataTable columns={columns} data={documents} searchKey="name" searchPlaceholder="Search documents..." />;
}
