"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { PackageCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { WarehouseStatusBadge } from "@/modules/warehouse/components/status-badge";
import { useAuth } from "@/providers/auth-provider";
import { completeDispatchLineAction } from "@/modules/warehouse/actions/dispatch-actions";
import type {
  WarehouseDispatchRow,
  WarehouseDispatchLineRow,
} from "@/modules/warehouse/repositories/warehouse-dispatch-repository";

export function DispatchDetail({
  record,
  lines,
  warehouseName,
  itemLabels,
  modelLabels,
  locationCodes,
}: {
  record: WarehouseDispatchRow;
  lines: WarehouseDispatchLineRow[];
  warehouseName: string;
  itemLabels: Record<string, string>;
  modelLabels: Record<string, string>;
  locationCodes: Record<string, string>;
}) {
  const { hasPermission } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const canDispatch = hasPermission("warehouse.manage") || hasPermission("warehouse.dispatch");

  const completeLine = useMutation({
    mutationFn: (lineId: string) => completeDispatchLineAction(record.id, lineId),
    onSuccess: (result) => {
      if (result.success) {
        toast.success("Line dispatched");
        queryClient.invalidateQueries({ queryKey: ["warehouse-dispatch", record.id] });
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
              <dt className="text-muted-foreground">Destination</dt>
              <dd className="font-medium capitalize">{record.destination_type.replace(/_/g, " ")}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Reference</dt>
              <dd className="font-medium">{record.destination_reference ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Dispatched</dt>
              <dd className="font-medium">{record.dispatched_at ? new Date(record.dispatched_at).toLocaleString() : "—"}</dd>
            </div>
          </dl>
          {record.notes && <p className="text-muted-foreground mt-4 text-sm">{record.notes}</p>}
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
                <TableHead>Source</TableHead>
                <TableHead>Status</TableHead>
                {canDispatch && <TableHead className="w-32" />}
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
                    {line.source_warehouse_location_id ? locationCodes[line.source_warehouse_location_id] ?? "—" : "—"}
                  </TableCell>
                  <TableCell>
                    {line.dispatched ? (
                      <WarehouseStatusBadge status="completed" />
                    ) : (
                      <WarehouseStatusBadge status="pending" />
                    )}
                  </TableCell>
                  {canDispatch && (
                    <TableCell>
                      {!line.dispatched && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={completeLine.isPending}
                          onClick={() => completeLine.mutate(line.id)}
                        >
                          <PackageCheck /> Dispatch
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
