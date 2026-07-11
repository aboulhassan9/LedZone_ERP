"use client";

import { useMemo } from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { QuoteStatusBadge } from "@/modules/crm/components/status-badge";
import type { QuoteRow } from "@/modules/crm/repositories/quote-repository";

export function QuoteTable({
  quotes,
  customerNames,
}: {
  quotes: QuoteRow[];
  customerNames: Record<string, string>;
}) {
  const columns = useMemo<ColumnDef<QuoteRow>[]>(
    () => [
      {
        accessorKey: "quote_number",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Quote #" />,
        cell: ({ row }) => (
          <Link href={`/crm/quotes/${row.original.id}`} className="font-medium hover:underline">
            {row.original.quote_number}
          </Link>
        ),
      },
      {
        id: "customer",
        header: "Customer",
        accessorFn: (row) => customerNames[row.customer_id] ?? "—",
      },
      { accessorKey: "status", header: "Status", cell: ({ row }) => <QuoteStatusBadge status={row.original.status} /> },
      { accessorKey: "currency_code", header: "Currency" },
      {
        accessorKey: "valid_until",
        header: "Valid until",
        cell: ({ row }) => (row.original.valid_until ? new Date(row.original.valid_until).toLocaleDateString() : "—"),
      },
    ],
    [customerNames]
  );

  return <DataTable columns={columns} data={quotes} searchKey="quote_number" searchPlaceholder="Search quotes..." />;
}
