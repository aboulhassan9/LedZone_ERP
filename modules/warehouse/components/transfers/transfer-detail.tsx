"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Send, CheckCircle2, XCircle, Ban, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { WarehouseStatusBadge } from "@/modules/warehouse/components/status-badge";
import { useAuth } from "@/providers/auth-provider";
import {
  submitTransferAction,
  approveTransferAction,
  rejectTransferAction,
  cancelTransferAction,
  executeTransferAction,
} from "@/modules/warehouse/actions/warehouse-transfer-actions";
import type {
  WarehouseTransferRow,
  WarehouseTransferLineRow,
} from "@/modules/warehouse/repositories/warehouse-transfer-repository";

function ReasonDialog({
  label,
  requireReason,
  onConfirm,
  trigger,
}: {
  label: string;
  requireReason: boolean;
  onConfirm: (reason: string) => void;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{label}</DialogTitle>
          <DialogDescription>{requireReason ? "A reason is required." : "Optional reason."}</DialogDescription>
        </DialogHeader>
        <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason..." />
        <DialogFooter>
          <Button
            disabled={requireReason && reason.trim().length === 0}
            onClick={() => {
              onConfirm(reason);
              setOpen(false);
              setReason("");
            }}
          >
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function TransferDetail({
  transfer,
  lines,
  warehouseNames,
  locationCodes,
  itemLabels,
  modelLabels,
}: {
  transfer: WarehouseTransferRow;
  lines: WarehouseTransferLineRow[];
  warehouseNames: Record<string, string>;
  locationCodes: Record<string, string>;
  itemLabels: Record<string, string>;
  modelLabels: Record<string, string>;
}) {
  const { hasPermission } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  const canTransfer = hasPermission("warehouse.manage") || hasPermission("warehouse.transfer");
  const canApprove = hasPermission("warehouse.manage") || hasPermission("warehouse.approve");

  function afterMutation() {
    queryClient.invalidateQueries({ queryKey: ["warehouse-transfer", transfer.id] });
    router.refresh();
  }

  const submitMutation = useMutation({
    mutationFn: () => submitTransferAction(transfer.id),
    onSuccess: (result) => {
      if (result.success) {
        toast.success("Transfer submitted for approval");
        afterMutation();
      } else toast.error(result.error.message);
    },
  });

  const approveMutation = useMutation({
    mutationFn: () => approveTransferAction(transfer.id),
    onSuccess: (result) => {
      if (result.success) {
        toast.success("Transfer approved");
        afterMutation();
      } else toast.error(result.error.message);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (reason: string) => rejectTransferAction(transfer.id, { reason }),
    onSuccess: (result) => {
      if (result.success) {
        toast.success("Transfer rejected");
        afterMutation();
      } else toast.error(result.error.message);
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (reason: string) => cancelTransferAction(transfer.id, { reason: reason || undefined }),
    onSuccess: (result) => {
      if (result.success) {
        toast.success("Transfer cancelled");
        afterMutation();
      } else toast.error(result.error.message);
    },
  });

  const executeMutation = useMutation({
    mutationFn: () => executeTransferAction(transfer.id),
    onSuccess: (result) => {
      if (result.success) {
        toast.success("Transfer executed");
        afterMutation();
      } else toast.error(result.error.message);
    },
  });

  const cancellable = !["completed", "cancelled", "rejected", "failed"].includes(transfer.status);

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            {warehouseNames[transfer.from_warehouse_id] ?? "—"} → {warehouseNames[transfer.to_warehouse_id] ?? "—"}
            <WarehouseStatusBadge status={transfer.status} />
          </CardTitle>
          <div className="flex flex-wrap gap-2">
            {canTransfer && transfer.status === "draft" && (
              <Button size="sm" disabled={submitMutation.isPending} onClick={() => submitMutation.mutate()}>
                <Send /> Submit
              </Button>
            )}
            {canApprove && transfer.status === "submitted" && (
              <Button size="sm" disabled={approveMutation.isPending} onClick={() => approveMutation.mutate()}>
                <CheckCircle2 /> Approve
              </Button>
            )}
            {canApprove && transfer.status === "submitted" && (
              <ReasonDialog
                label="Reject transfer"
                requireReason
                onConfirm={(reason) => rejectMutation.mutate(reason)}
                trigger={
                  <Button size="sm" variant="outline">
                    <XCircle /> Reject
                  </Button>
                }
              />
            )}
            {canTransfer && (transfer.status === "approved" || transfer.status === "in_transit") && (
              <Button size="sm" disabled={executeMutation.isPending} onClick={() => executeMutation.mutate()}>
                <PlayCircle /> Execute
              </Button>
            )}
            {canTransfer && cancellable && (
              <ReasonDialog
                label="Cancel transfer"
                requireReason={false}
                onConfirm={(reason) => cancelMutation.mutate(reason)}
                trigger={
                  <Button size="sm" variant="outline">
                    <Ban /> Cancel
                  </Button>
                }
              />
            )}
          </div>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
            <div>
              <dt className="text-muted-foreground">From location</dt>
              <dd className="font-mono font-medium">
                {transfer.from_location_id ? locationCodes[transfer.from_location_id] : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">To location</dt>
              <dd className="font-mono font-medium">
                {transfer.to_location_id ? locationCodes[transfer.to_location_id] : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Requested</dt>
              <dd className="font-medium">{new Date(transfer.requested_at).toLocaleString()}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Approved</dt>
              <dd className="font-medium">
                {transfer.approved_at ? new Date(transfer.approved_at).toLocaleString() : "—"}
              </dd>
            </div>
          </dl>
          {transfer.notes && <p className="text-muted-foreground mt-4 text-sm">{transfer.notes}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lines</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item / Consumable</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.map((line) => (
                <TableRow key={line.id}>
                  <TableCell>
                    {line.item_id ? itemLabels[line.item_id] ?? line.item_id : modelLabels[line.model_id ?? ""] ?? "—"}
                  </TableCell>
                  <TableCell>{line.quantity ?? 1}</TableCell>
                  <TableCell>
                    <WarehouseStatusBadge status={line.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
