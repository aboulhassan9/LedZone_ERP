"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Send, CheckCircle2, XCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { QuoteStatusBadge } from "@/modules/crm/components/status-badge";
import { useAuth } from "@/providers/auth-provider";
import { setQuoteStatusAction } from "@/modules/crm/actions/quote-actions";
import type { QuoteRow, QuoteLineItemRow } from "@/modules/crm/repositories/quote-repository";

export function QuoteDetail({
  quote,
  lineItems,
  customerName,
  eventName,
  modelNames,
}: {
  quote: QuoteRow;
  lineItems: QuoteLineItemRow[];
  customerName: string;
  eventName: string | null;
  modelNames: Record<string, string>;
}) {
  const { hasPermission } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const canManage = hasPermission("crm.manage") || hasPermission("crm.quotes.manage");

  function afterMutation() {
    queryClient.invalidateQueries({ queryKey: ["quote", quote.id] });
    router.refresh();
  }

  const setStatusMutation = useMutation({
    mutationFn: (status: "sent" | "accepted" | "rejected" | "expired") =>
      setQuoteStatusAction(quote.id, { status }),
    onSuccess: (result) => {
      if (result.success) {
        toast.success("Quote status updated");
        afterMutation();
      } else {
        toast.error(result.error.message);
      }
    },
  });

  const total = lineItems.reduce((sum, li) => sum + li.quantity * li.unit_price, 0);

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            {quote.quote_number}
            <QuoteStatusBadge status={quote.status} />
          </CardTitle>
          {canManage && (
            <div className="flex flex-wrap gap-2">
              {quote.status === "draft" && (
                <Button
                  size="sm"
                  disabled={setStatusMutation.isPending}
                  onClick={() => setStatusMutation.mutate("sent")}
                >
                  <Send /> Send
                </Button>
              )}
              {quote.status === "sent" && (
                <>
                  <Button
                    size="sm"
                    disabled={setStatusMutation.isPending}
                    onClick={() => setStatusMutation.mutate("accepted")}
                  >
                    <CheckCircle2 /> Mark accepted
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={setStatusMutation.isPending}
                    onClick={() => setStatusMutation.mutate("rejected")}
                  >
                    <XCircle /> Mark rejected
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={setStatusMutation.isPending}
                    onClick={() => setStatusMutation.mutate("expired")}
                  >
                    <Clock /> Mark expired
                  </Button>
                </>
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
              <dt className="text-muted-foreground">Currency</dt>
              <dd className="font-medium">{quote.currency_code}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Valid until</dt>
              <dd className="font-medium">
                {quote.valid_until ? new Date(quote.valid_until).toLocaleDateString() : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Event</dt>
              <dd className="font-medium">{eventName ?? "—"}</dd>
            </div>
          </dl>
          {quote.notes && <p className="text-muted-foreground mt-4 text-sm">{quote.notes}</p>}
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
                <TableHead>Model</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Unit price</TableHead>
                <TableHead>Line total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lineItems.map((li) => (
                <TableRow key={li.id}>
                  <TableCell className="font-medium">{modelNames[li.model_id] ?? li.model_id}</TableCell>
                  <TableCell>{li.quantity}</TableCell>
                  <TableCell>
                    {li.unit_price.toLocaleString()} {quote.currency_code}
                  </TableCell>
                  <TableCell>
                    {(li.quantity * li.unit_price).toLocaleString()} {quote.currency_code}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="mt-4 flex justify-end text-sm font-medium">
            Total: {total.toLocaleString()} {quote.currency_code}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
