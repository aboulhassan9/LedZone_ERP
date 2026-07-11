"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { PlayCircle, CheckCircle2, XCircle, RotateCcw, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AgreementStatusBadge, DepositStatusBadge } from "@/modules/rental/components/status-badge";
import { formatMoney } from "@/lib/currency";
import { useAuth } from "@/providers/auth-provider";
import { setAgreementStatusAction, setDepositStatusAction } from "@/modules/rental/actions/rental-agreement-actions";
import type {
  RentalAgreementRow,
  RentalAgreementLineItemRow,
} from "@/modules/rental/repositories/rental-agreement-repository";

export function AgreementDetail({
  agreement,
  lineItems,
  customerName,
  eventName,
  modelNames,
}: {
  agreement: RentalAgreementRow;
  lineItems: RentalAgreementLineItemRow[];
  customerName: string;
  eventName: string | null;
  modelNames: Record<string, string>;
}) {
  const { hasPermission } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const canManage = hasPermission("rental.manage") || hasPermission("rental.update");

  function afterMutation() {
    queryClient.invalidateQueries({ queryKey: ["rental-agreement", agreement.id] });
    router.refresh();
  }

  const setStatusMutation = useMutation({
    mutationFn: (status: "active" | "completed" | "cancelled") =>
      setAgreementStatusAction(agreement.id, { status }),
    onSuccess: (result) => {
      if (result.success) {
        toast.success("Agreement status updated");
        afterMutation();
      } else {
        toast.error(result.error.message);
      }
    },
  });

  const setDepositMutation = useMutation({
    mutationFn: (depositStatus: "refunded" | "forfeited") =>
      setDepositStatusAction(agreement.id, { depositStatus }),
    onSuccess: (result) => {
      if (result.success) {
        toast.success("Deposit updated");
        afterMutation();
      } else {
        toast.error(result.error.message);
      }
    },
  });

  const days = Math.max(
    1,
    Math.ceil(
      (new Date(agreement.rental_end_at).getTime() - new Date(agreement.rental_start_at).getTime()) /
        (24 * 60 * 60 * 1000)
    )
  );
  const total = lineItems.reduce((sum, li) => sum + li.quantity * li.daily_rate * days, 0);
  const canSettleDeposit =
    canManage && ["completed", "cancelled"].includes(agreement.status) && agreement.deposit_status === "held";

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            {agreement.agreement_number}
            <AgreementStatusBadge status={agreement.status} />
          </CardTitle>
          {canManage && (
            <div className="flex flex-wrap gap-2">
              {agreement.status === "draft" && (
                <Button size="sm" disabled={setStatusMutation.isPending} onClick={() => setStatusMutation.mutate("active")}>
                  <PlayCircle /> Activate
                </Button>
              )}
              {agreement.status === "active" && (
                <Button size="sm" disabled={setStatusMutation.isPending} onClick={() => setStatusMutation.mutate("completed")}>
                  <CheckCircle2 /> Complete
                </Button>
              )}
              {["draft", "active"].includes(agreement.status) && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={setStatusMutation.isPending}
                  onClick={() => setStatusMutation.mutate("cancelled")}
                >
                  <XCircle /> Cancel
                </Button>
              )}
              {canSettleDeposit && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={setDepositMutation.isPending}
                    onClick={() => setDepositMutation.mutate("refunded")}
                  >
                    <RotateCcw /> Refund deposit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={setDepositMutation.isPending}
                    onClick={() => setDepositMutation.mutate("forfeited")}
                  >
                    <Ban /> Forfeit deposit
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
              <dt className="text-muted-foreground">Event</dt>
              <dd className="font-medium">{eventName ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Rental window</dt>
              <dd className="font-medium">
                {new Date(agreement.rental_start_at).toLocaleDateString()} –{" "}
                {new Date(agreement.rental_end_at).toLocaleDateString()} ({days} day{days === 1 ? "" : "s"})
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Deposit</dt>
              <dd className="flex items-center gap-2 font-medium">
                {formatMoney(agreement.deposit_amount, agreement.currency_code)}
                <DepositStatusBadge status={agreement.deposit_status} />
              </dd>
            </div>
          </dl>
          {agreement.notes && <p className="text-muted-foreground mt-4 text-sm">{agreement.notes}</p>}
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
                <TableHead>Daily rate</TableHead>
                <TableHead>Line total ({days}d)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lineItems.map((li) => (
                <TableRow key={li.id}>
                  <TableCell className="font-medium">{modelNames[li.model_id] ?? li.model_id}</TableCell>
                  <TableCell>{li.quantity}</TableCell>
                  <TableCell>{formatMoney(li.daily_rate, agreement.currency_code)}</TableCell>
                  <TableCell>{formatMoney(li.quantity * li.daily_rate * days, agreement.currency_code)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="mt-4 flex justify-end text-sm font-medium">
            Total: {formatMoney(total, agreement.currency_code)}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
