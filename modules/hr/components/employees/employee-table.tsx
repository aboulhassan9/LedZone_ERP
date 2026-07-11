"use client";

import { useMemo } from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { HrStatusBadge } from "@/modules/hr/components/status-badge";
import type { EmployeeRow } from "@/modules/hr/repositories/employee-repository";

export function EmployeeTable({ employees }: { employees: EmployeeRow[] }) {
  const columns = useMemo<ColumnDef<EmployeeRow>[]>(
    () => [
      {
        accessorKey: "full_name",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
        cell: ({ row }) => (
          <Link href={`/hr/${row.original.id}`} className="font-medium hover:underline">
            {row.original.full_name}
          </Link>
        ),
      },
      { accessorKey: "role", header: "Role", cell: ({ row }) => row.original.role ?? "—" },
      {
        accessorKey: "employment_type",
        header: "Employment",
        cell: ({ row }) => (row.original.employment_type ? row.original.employment_type.replace(/_/g, " ") : "—"),
      },
      {
        accessorKey: "hire_date",
        header: "Hired",
        cell: ({ row }) => (row.original.hire_date ? new Date(row.original.hire_date).toLocaleDateString() : "—"),
      },
      {
        accessorKey: "hr_status",
        header: "Status",
        cell: ({ row }) => <HrStatusBadge status={row.original.hr_status} />,
      },
    ],
    []
  );

  return <DataTable columns={columns} data={employees} searchKey="full_name" searchPlaceholder="Search employees..." />;
}
