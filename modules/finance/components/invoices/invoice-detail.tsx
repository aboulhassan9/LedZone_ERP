"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Send, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { InvoiceStatusBadge } from "@/modules/finance/components/status-badge";
import { RecordPaymentDialog } from "@/modules/finance/components/invoices/record-payment-dialog";
import { formatMoney } from "@/lib/currency";
import { useAuth } from "@/providers/auth-provider";
import { setInvoiceStatusAction } from "@/modules/finance/actions/invoice-actions";
import type {
  InvoiceRow,
  InvoiceLineItemRow,
  InvoicePaymentRow,
} from "@/modules/finance/repositories/invoice-repository";

export function InvoiceDetail({
  invoice,
  lineItems,
  payments,
  customerName,
  eventName,
}: {
  invoice: InvoiceRow;
  lineItems: InvoiceLineItemRow[];
  payments: InvoicePaymentRow[];
  customerName: string;
  eventName: string | null;
}) {
  const { hasPermission } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const canManage = hasPermission("finance.manage") || hasPermission("finance.invoices.manage");

  function afterMutation() {
    queryClient.invalidateQueries({ queryKey: ["invoice", invoice.id] });
    router.refresh();
  }

  const setStatusMutation = useMutation({
    mutationFn: (status: "sent" | "paid" | "cancelled") => setInvoiceStatusAction(invoice.id, { status }),
    onSuccess: (result) => {
      if (result.success) {
        toast.success("Invoice status updated");
        afterMutation();
      } else {
        toast.error(result.error.message);
      }
    },
  });

  const total = lineItems.reduce((sum, li) => sum + li.quantity * li.unit_price, 0);
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const balance = total - totalPaid;

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            {invoice.invoice_number}
            <InvoiceStatusBadge status={invoice.status} />
          </CardTitle>
          {canManage && (
            <div className="flex flex-wrap gap-2">
              {invoice.status === "draft" && (
                <Button size="sm" disabled={setStatusMutation.isPending} onClick={() => setStatusMutation.mutate("sent")}>
                  <Send /> Send
                </Button>
              )}
              {invoice.status === "sent" && (
                <>
                  <RecordPaymentDialog invoiceId={invoice.id} />
                  <Button size="sm" disabled={setStatusMutation.isPending} onClick={() => setStatusMutation.mutate("paid")}>
                    <CheckCircle2 /> Mark paid
                  </Button>
                </>
              )}
              {["draft", "sent"].includes(invoice.status) && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={setStatusMutation.isPending}
                  onClick={() => setStatusMutation.mutate("cancelled")}
                >
                  <XCircle /> Cancel
                </Button>
              )}
            </div>
          )}
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
            <div>
              <dt className="text-muted-foreground">Customer</dt>
              <dd className="font-medium">{customerName}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Event</dt>
              <dd className="font-medium">{eventName ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Issue date</dt>
              <dd className="font-medium">{new Date(invoice.issue_date).toLocaleDateString()}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Due date</dt>
              <dd className="font-medium">{invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : "—"}</dd>
            </div>
          </dl>
          {invoice.notes && <p className="text-muted-foreground mt-4 text-sm">{invoice.notes}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Line items</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Unit price</TableHead>
                <TableHead>Line total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lineItems.map((li) => (
                <TableRow key={li.id}>
                  <TableCell className="font-medium">{li.description}</TableCell>
                  <TableCell>{li.quantity}</TableCell>
                  <TableCell>{formatMoney(li.unit_price, invoice.currency_code)}</TableCell>
                  <TableCell>{formatMoney(li.quantity * li.unit_price, invoice.currency_code)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="mt-4 flex flex-col items-end gap-1 text-sm">
            <div>Total: {formatMoney(total, invoice.currency_code)}</div>
            <div className="text-muted-foreground">Paid: {formatMoney(totalPaid, invoice.currency_code)}</div>
            <div className="font-medium">Balance: {formatMoney(balance, invoice.currency_code)}</div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Payments</CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <p className="text-muted-foreground text-sm">No payments recorded yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Reference</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{new Date(p.paid_at).toLocaleDateString()}</TableCell>
                    <TableCell>{formatMoney(p.amount, invoice.currency_code)}</TableCell>
                    <TableCell className="capitalize">{p.method.replace(/_/g, " ")}</TableCell>
                    <TableCell>{p.reference ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
