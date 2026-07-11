"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { PlayCircle, Save, Send, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { WarehouseStatusBadge } from "@/modules/warehouse/components/status-badge";
import { useAuth } from "@/providers/auth-provider";
import {
  recordCountAction,
  startCycleCountAction,
  submitForApprovalAction,
  approveCycleCountAction,
} from "@/modules/warehouse/actions/cycle-count-actions";
import type {
  WarehouseCycleCountRow,
  WarehouseCycleCountLineRow,
} from "@/modules/warehouse/repositories/warehouse-cycle-count-repository";

export function CycleCountDetail({
  cycleCount,
  lines,
  warehouseName,
  itemLabels,
  modelLabels,
}: {
  cycleCount: WarehouseCycleCountRow;
  lines: WarehouseCycleCountLineRow[];
  warehouseName: string;
  itemLabels: Record<string, string>;
  modelLabels: Record<string, string>;
}) {
  const { hasPermission } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const canCount = hasPermission("warehouse.manage") || hasPermission("warehouse.count");
  const canApprove = hasPermission("warehouse.manage") || hasPermission("warehouse.approve");
  const [counts, setCounts] = useState<Record<string, string>>({});

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["warehouse-cycle-count", cycleCount.id] });
    router.refresh();
  }

  const start = useMutation({
    mutationFn: () => startCycleCountAction(cycleCount.id),
    onSuccess: (result) => {
      if (result.success) {
        toast.success("Cycle count started");
        invalidate();
      } else {
        toast.error(result.error.message);
      }
    },
  });

  const recordCount = useMutation({
    mutationFn: (lineId: string) => recordCountAction(lineId, cycleCount.id, { countedQty: Number(counts[lineId] ?? 0) }),
    onSuccess: (result) => {
      if (result.success) {
        toast.success("Count recorded");
        invalidate();
      } else {
        toast.error(result.error.message);
      }
    },
  });

  const submit = useMutation({
    mutationFn: () => submitForApprovalAction(cycleCount.id),
    onSuccess: (result) => {
      if (result.success) {
        toast.success("Submitted for approval");
        invalidate();
      } else {
        toast.error(result.error.message);
      }
    },
  });

  const approve = useMutation({
    mutationFn: () => approveCycleCountAction(cycleCount.id),
    onSuccess: (result) => {
      if (result.success) {
        toast.success("Cycle count approved");
        invalidate();
      } else {
        toast.error(result.error.message);
      }
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            {warehouseName}
            <WarehouseStatusBadge status={cycleCount.status} />
          </CardTitle>
          <div className="flex gap-2">
            {canCount && cycleCount.status === "scheduled" && (
              <Button size="sm" variant="outline" disabled={start.isPending} onClick={() => start.mutate()}>
                <PlayCircle /> Start
              </Button>
            )}
            {canCount && (cycleCount.status === "in_progress" || cycleCount.status === "scheduled") && (
              <Button size="sm" variant="outline" disabled={submit.isPending} onClick={() => submit.mutate()}>
                <Send /> Submit for approval
              </Button>
            )}
            {canApprove && cycleCount.status === "pending_approval" && (
              <Button size="sm" disabled={approve.isPending} onClick={() => approve.mutate()}>
                <ShieldCheck /> Approve
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
            <div>
              <dt className="text-muted-foreground">Scope</dt>
              <dd className="font-medium capitalize">{cycleCount.scope_type}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Scheduled</dt>
              <dd className="font-medium">{cycleCount.scheduled_date ? new Date(cycleCount.scheduled_date).toLocaleDateString() : "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Started</dt>
              <dd className="font-medium">{cycleCount.started_at ? new Date(cycleCount.started_at).toLocaleString() : "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Completed</dt>
              <dd className="font-medium">{cycleCount.completed_at ? new Date(cycleCount.completed_at).toLocaleString() : "—"}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Difference report</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item / Consumable</TableHead>
                <TableHead>Expected</TableHead>
                <TableHead>Counted</TableHead>
                <TableHead>Variance</TableHead>
                <TableHead>Adjustment</TableHead>
                {canCount && <TableHead className="w-56" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.map((line) => (
                <TableRow key={line.id}>
                  <TableCell>
                    {line.item_id ? itemLabels[line.item_id] ?? line.item_id : modelLabels[line.model_id ?? ""] ?? "—"}
                  </TableCell>
                  <TableCell>{line.expected_qty}</TableCell>
                  <TableCell>{line.counted_qty ?? "—"}</TableCell>
                  <TableCell>
                    {line.variance == null ? (
                      "—"
                    ) : (
                      <span className={line.variance === 0 ? "" : "text-destructive font-medium"}>
                        {line.variance > 0 ? `+${line.variance}` : line.variance}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>{line.adjustment_applied ? <WarehouseStatusBadge status="completed" /> : "—"}</TableCell>
                  {canCount && (
                    <TableCell>
                      {cycleCount.status === "in_progress" && line.counted_qty == null && (
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min={0}
                            step="0.01"
                            className="h-9 w-24"
                            value={counts[line.id] ?? ""}
                            onChange={(e) => setCounts((c) => ({ ...c, [line.id]: e.target.value }))}
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={recordCount.isPending}
                            onClick={() => recordCount.mutate(line.id)}
                          >
                            <Save /> Record
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
