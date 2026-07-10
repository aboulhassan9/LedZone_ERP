"use client";

import { useMemo } from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { LifecycleStageBadge } from "@/modules/crm/components/status-badge";
import type { CustomerRow } from "@/modules/crm/repositories/customer-repository";

export function CustomerTable({ customers }: { customers: CustomerRow[] }) {
  const columns = useMemo<ColumnDef<CustomerRow>[]>(
    () => [
      {
        id: "name",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
        accessorFn: (row) => row.company_name ?? row.full_name ?? "—",
        cell: ({ row }) => (
          <Link href={`/crm/customers/${row.original.id}`} className="font-medium hover:underline">
            {row.original.company_name ?? row.original.full_name ?? "—"}
          </Link>
        ),
      },
      {
        accessorKey: "customer_type",
        header: "Type",
        cell: ({ row }) => (row.original.customer_type === "company" ? "Company" : "Individual"),
      },
      {
        accessorKey: "lifecycle_stage",
        header: "Stage",
        cell: ({ row }) => <LifecycleStageBadge stage={row.original.lifecycle_stage} />,
      },
      { accessorKey: "email", header: "Email", cell: ({ row }) => row.original.email ?? "—" },
      { accessorKey: "phone", header: "Phone", cell: ({ row }) => row.original.phone ?? "—" },
    ],
    []
  );

  return <DataTable columns={columns} data={customers} searchKey="name" searchPlaceholder="Search customers..." />;
}
