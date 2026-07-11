"use client";

import { useMemo } from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { Badge } from "@/components/ui/badge";
import { InvoiceStatusBadge } from "@/modules/finance/components/status-badge";
import type { InvoiceRow } from "@/modules/finance/repositories/invoice-repository";

export function InvoiceTable({
  invoices,
  customerNames,
}: {
  invoices: InvoiceRow[];
  customerNames: Record<string, string>;
}) {
  const columns = useMemo<ColumnDef<InvoiceRow>[]>(
    () => [
      {
        accessorKey: "invoice_number",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Invoice #" />,
        cell: ({ row }) => (
          <Link href={`/finance/invoices/${row.original.id}`} className="font-medium hover:underline">
            {row.original.invoice_number}
          </Link>
        ),
      },
      {
        id: "customer",
        header: "Customer",
        accessorFn: (row) => customerNames[row.customer_id] ?? "—",
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
          const overdue =
            row.original.status === "sent" &&
            row.original.due_date &&
            new Date(row.original.due_date) < new Date();
          return (
            <div className="flex items-center gap-2">
              <InvoiceStatusBadge status={row.original.status} />
              {overdue && <Badge variant="destructive">Overdue</Badge>}
            </div>
          );
        },
      },
      { accessorKey: "currency_code", header: "Currency" },
      {
        accessorKey: "due_date",
        header: "Due",
        cell: ({ row }) => (row.original.due_date ? new Date(row.original.due_date).toLocaleDateString() : "—"),
      },
    ],
    [customerNames]
  );

  return (
    <DataTable columns={columns} data={invoices} searchKey="invoice_number" searchPlaceholder="Search invoices..." />
  );
}
