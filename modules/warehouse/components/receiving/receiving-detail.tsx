"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { WarehouseStatusBadge } from "@/modules/warehouse/components/status-badge";
import { useAuth } from "@/providers/auth-provider";
import { completeReceivingLineAction } from "@/modules/warehouse/actions/receiving-actions";
import type {
  WarehouseReceivingRow,
  WarehouseReceivingLineRow,
} from "@/modules/warehouse/repositories/warehouse-receiving-repository";

export function ReceivingDetail({
  record,
  lines,
  warehouseName,
  itemLabels,
  modelLabels,
  locationCodes,
}: {
  record: WarehouseReceivingRow;
  lines: WarehouseReceivingLineRow[];
  warehouseName: string;
  itemLabels: Record<string, string>;
  modelLabels: Record<string, string>;
  locationCodes: Record<string, string>;
}) {
  const { hasPermission } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const canReceive = hasPermission("warehouse.manage") || hasPermission("warehouse.receive");

  const completeLine = useMutation({
    mutationFn: (lineId: string) => completeReceivingLineAction(lineId, record.id),
    onSuccess: (result) => {
      if (result.success) {
        toast.success("Line placed");
        queryClient.invalidateQueries({ queryKey: ["warehouse-receiving", record.id] });
        router.refresh();
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
            <WarehouseStatusBadge status={record.status} />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
            <div>
              <dt className="text-muted-foreground">Source</dt>
              <dd className="font-medium capitalize">{record.source_type.replace(/_/g, " ")}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Received</dt>
              <dd className="font-medium">{new Date(record.received_at).toLocaleString()}</dd>
            </div>
          </dl>
          {record.reference_note && <p className="text-muted-foreground mt-4 text-sm">{record.reference_note}</p>}
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
                <TableHead>Destination</TableHead>
                <TableHead>Condition</TableHead>
                <TableHead>Status</TableHead>
                {canReceive && <TableHead className="w-32" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.map((line) => (
                <TableRow key={line.id}>
                  <TableCell>
                    {line.item_id ? itemLabels[line.item_id] ?? line.item_id : modelLabels[line.model_id ?? ""] ?? "—"}
                  </TableCell>
                  <TableCell>{line.quantity ?? 1}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {line.destination_warehouse_location_id
                      ? locationCodes[line.destination_warehouse_location_id] ?? "—"
                      : "—"}
                  </TableCell>
                  <TableCell>{line.condition_on_arrival ?? "—"}</TableCell>
                  <TableCell>
                    {line.placed ? (
                      <WarehouseStatusBadge status="completed" />
                    ) : (
                      <WarehouseStatusBadge status="pending" />
                    )}
                  </TableCell>
                  {canReceive && (
                    <TableCell>
                      {!line.placed && line.destination_warehouse_location_id && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={completeLine.isPending}
                          onClick={() => completeLine.mutate(line.id)}
                        >
                          <CheckCircle2 /> Place
                        </Button>
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
