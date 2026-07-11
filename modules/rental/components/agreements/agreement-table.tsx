"use client";

import { useMemo } from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { AgreementStatusBadge } from "@/modules/rental/components/status-badge";
import type { RentalAgreementRow } from "@/modules/rental/repositories/rental-agreement-repository";

export function AgreementTable({
  agreements,
  customerNames,
}: {
  agreements: RentalAgreementRow[];
  customerNames: Record<string, string>;
}) {
  const columns = useMemo<ColumnDef<RentalAgreementRow>[]>(
    () => [
      {
        accessorKey: "agreement_number",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Agreement #" />,
        cell: ({ row }) => (
          <Link href={`/rental/${row.original.id}`} className="font-medium hover:underline">
            {row.original.agreement_number}
          </Link>
        ),
      },
      {
        id: "customer",
        header: "Customer",
        accessorFn: (row) => customerNames[row.customer_id] ?? "—",
      },
      {
        id: "window",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Window" />,
        accessorFn: (row) => row.rental_start_at,
        cell: ({ row }) => (
          <span className="text-sm">
            {new Date(row.original.rental_start_at).toLocaleDateString()} –{" "}
            {new Date(row.original.rental_end_at).toLocaleDateString()}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <AgreementStatusBadge status={row.original.status} />,
      },
      { accessorKey: "currency_code", header: "Currency" },
    ],
    [customerNames]
  );

  return (
    <DataTable
      columns={columns}
      data={agreements}
      searchKey="agreement_number"
      searchPlaceholder="Search agreements..."
    />
  );
}
