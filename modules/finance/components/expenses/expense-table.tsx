"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { Button } from "@/components/ui/button";
import { ExpenseStatusBadge } from "@/modules/finance/components/status-badge";
import { ExpenseFormDialog, type CurrencyOption, type EventOption } from "@/modules/finance/components/expenses/expense-form-dialog";
import { formatMoney } from "@/lib/currency";
import { useAuth } from "@/providers/auth-provider";
import { setExpenseStatusAction } from "@/modules/finance/actions/expense-actions";
import type { ExpenseRow } from "@/modules/finance/repositories/expense-repository";

export function ExpenseTable({
  expenses,
  currencies,
  events,
  eventNames,
}: {
  expenses: ExpenseRow[];
  currencies: CurrencyOption[];
  events: EventOption[];
  eventNames: Record<string, string>;
}) {
  const { hasPermission } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const canManage = hasPermission("finance.manage") || hasPermission("finance.expenses.manage");
  const [editing, setEditing] = useState<ExpenseRow | null>(null);

  const setStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "approved" | "paid" | "cancelled" }) =>
      setExpenseStatusAction(id, { status }),
    onSuccess: (result) => {
      if (result.success) {
        toast.success("Expense status updated");
        queryClient.invalidateQueries({ queryKey: ["expenses"] });
        router.refresh();
      } else {
        toast.error(result.error.message);
      }
    },
  });

  const columns = useMemo<ColumnDef<ExpenseRow>[]>(
    () => [
      {
        accessorKey: "description",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Description" />,
        cell: ({ row }) => <span className="font-medium">{row.original.description}</span>,
      },
      { accessorKey: "category", header: "Category", cell: ({ row }) => <span className="capitalize">{row.original.category.replace(/_/g, " ")}</span> },
      {
        id: "amount",
        header: "Amount",
        accessorFn: (row) => row.amount,
        cell: ({ row }) => formatMoney(row.original.amount, row.original.currency_code),
      },
      {
        accessorKey: "expense_date",
        header: "Date",
        cell: ({ row }) => new Date(row.original.expense_date).toLocaleDateString(),
      },
      {
        id: "event",
        header: "Event",
        accessorFn: (row) => (row.event_id ? eventNames[row.event_id] ?? "—" : "—"),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <ExpenseStatusBadge status={row.original.status} />,
      },
      ...(canManage
        ? [
            {
              id: "actions",
              cell: ({ row }: { row: { original: ExpenseRow } }) => (
                <div className="flex justify-end gap-1">
                  {row.original.status === "draft" && (
                    <Button size="sm" variant="ghost" onClick={() => setEditing(row.original)}>
                      Edit
                    </Button>
                  )}
                  {row.original.status === "draft" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={setStatusMutation.isPending}
                      onClick={() => setStatusMutation.mutate({ id: row.original.id, status: "approved" })}
                    >
                      Approve
                    </Button>
                  )}
                  {row.original.status === "approved" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={setStatusMutation.isPending}
                      onClick={() => setStatusMutation.mutate({ id: row.original.id, status: "paid" })}
                    >
                      Mark paid
                    </Button>
                  )}
                  {["draft", "approved"].includes(row.original.status) && (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={setStatusMutation.isPending}
                      onClick={() => setStatusMutation.mutate({ id: row.original.id, status: "cancelled" })}
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              ),
            } satisfies ColumnDef<ExpenseRow>,
          ]
        : []),
    ],
    [canManage, eventNames, setStatusMutation]
  );

  return (
    <>
      <DataTable columns={columns} data={expenses} searchKey="description" searchPlaceholder="Search expenses..." />
      {editing && (
        <ExpenseFormDialog
          expense={editing}
          currencies={currencies}
          events={events}
          open={!!editing}
          onOpenChange={(open) => !open && setEditing(null)}
        />
      )}
    </>
  );
}
