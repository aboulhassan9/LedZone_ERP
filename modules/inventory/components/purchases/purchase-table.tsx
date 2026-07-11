"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { StatusBadge } from "@/modules/inventory/components/status-badge";
import { useAuth } from "@/providers/auth-provider";
import { formatMoney } from "@/lib/currency";
import { PurchaseFormDialog } from "@/modules/inventory/components/purchases/purchase-form-dialog";
import type { EquipmentPurchaseRow } from "@/modules/inventory/repositories/purchase-repository";
import type { SupplierRow } from "@/modules/inventory/repositories/supplier-repository";

export function PurchaseTable({
  purchases,
  suppliers,
  currencies,
}: {
  purchases: EquipmentPurchaseRow[];
  suppliers: SupplierRow[];
  currencies: { code: string; name: string }[];
}) {
  const { hasPermission } = useAuth();
  const canManage = hasPermission("inventory.manage");
  const canViewFinancials = hasPermission("inventory.financials.view");
  const [editing, setEditing] = useState<EquipmentPurchaseRow | null>(null);

  const supplierName = (id: string) => suppliers.find((s) => s.id === id)?.name ?? "—";

  const columns = useMemo<ColumnDef<EquipmentPurchaseRow>[]>(
    () => [
      {
        accessorKey: "purchase_date",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Date" />,
      },
      { id: "supplier", header: "Supplier", cell: ({ row }) => supplierName(row.original.supplier_id) },
      {
        accessorKey: "invoice_number",
        header: "Invoice #",
        cell: ({ row }) => row.original.invoice_number ?? "—",
      },
      ...(canViewFinancials
        ? [
            {
              id: "total",
              header: "Total",
              cell: ({ row }: { row: { original: EquipmentPurchaseRow } }) =>
                formatMoney(row.original.total_amount, row.original.currency_code),
            } satisfies ColumnDef<EquipmentPurchaseRow>,
          ]
        : []),
      { accessorKey: "status", header: "Status", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
      ...(canManage
        ? [
            {
              id: "actions",
              cell: ({ row }: { row: { original: EquipmentPurchaseRow } }) => (
                <Button variant="outline" size="sm" onClick={() => setEditing(row.original)}>
                  Edit
                </Button>
              ),
            } satisfies ColumnDef<EquipmentPurchaseRow>,
          ]
        : []),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [purchases, suppliers, canManage, canViewFinancials]
  );

  return (
    <>
      <DataTable
        columns={columns}
        data={purchases}
        searchKey="invoice_number"
        searchPlaceholder="Search by invoice number..."
      />
      {editing && (
        <PurchaseFormDialog
          purchase={editing}
          suppliers={suppliers}
          currencies={currencies}
          open={!!editing}
          onOpenChange={(open) => !open && setEditing(null)}
        />
      )}
    </>
  );
}
