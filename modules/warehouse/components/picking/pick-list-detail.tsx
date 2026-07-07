"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { CheckCircle2, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { WarehouseStatusBadge } from "@/modules/warehouse/components/status-badge";
import { useAuth } from "@/providers/auth-provider";
import { completePickLineAction, startPickListAction } from "@/modules/warehouse/actions/picking-actions";
import type {
  WarehousePickListRow,
  WarehousePickListLineRow,
} from "@/modules/warehouse/repositories/warehouse-picking-repository";

export function PickListDetail({
  pickList,
  lines,
  warehouseName,
  assignedToName,
  itemLabels,
  modelLabels,
  locations,
}: {
  pickList: WarehousePickListRow;
  lines: WarehousePickListLineRow[];
  warehouseName: string;
  assignedToName: string | null;
  itemLabels: Record<string, string>;
  modelLabels: Record<string, string>;
  locations: { id: string; label: string }[];
}) {
  const { hasPermission } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const canPick = hasPermission("warehouse.manage") || hasPermission("warehouse.pick");
  const [destinations, setDestinations] = useState<Record<string, string>>({});

  const startList = useMutation({
    mutationFn: () => startPickListAction(pickList.id),
    onSuccess: (result) => {
      if (result.success) {
        toast.success("Pick list started");
        router.refresh();
      } else {
        toast.error(result.error.message);
      }
    },
  });

  const completeLine = useMutation({
    mutationFn: (lineId: string) =>
      completePickLineAction(lineId, pickList.id, { toWarehouseLocationId: destinations[lineId] || undefined }),
    onSuccess: (result) => {
      if (result.success) {
        toast.success("Line picked");
        queryClient.invalidateQueries({ queryKey: ["warehouse-picking", pickList.id] });
        router.refresh();
      } else {
        toast.error(result.error.message);
      }
    },
  });

  const completedCount = lines.filter((l) => l.picked).length;

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            {warehouseName}
            <WarehouseStatusBadge status={pickList.status} />
          </CardTitle>
          {canPick && pickList.status === "pending" && (
            <Button size="sm" variant="outline" disabled={startList.isPending} onClick={() => startList.mutate()}>
              <PlayCircle /> Start picking
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
            <div>
              <dt className="text-muted-foreground">Method</dt>
              <dd className="font-medium capitalize">{pickList.method}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Assigned to</dt>
              <dd className="font-medium">{assignedToName ?? "Unassigned"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Progress</dt>
              <dd className="font-medium">
                {completedCount} / {lines.length} picked
              </dd>
            </div>
          </dl>
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
                {canPick && <TableHead className="w-72">Stage to</TableHead>}
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
                    {line.picked ? <WarehouseStatusBadge status="completed" /> : <WarehouseStatusBadge status="pending" />}
                  </TableCell>
                  {canPick && (
                    <TableCell>
                      {!line.picked && (
                        <div className="flex items-center gap-2">
                          {line.item_id && (
                            <Select
                              value={destinations[line.id] ?? ""}
                              onValueChange={(value) => setDestinations((d) => ({ ...d, [line.id]: value }))}
                            >
                              <SelectTrigger className="h-9 w-full">
                                <SelectValue placeholder="Optional staging location" />
                              </SelectTrigger>
                              <SelectContent>
                                {locations.map((loc) => (
                                  <SelectItem key={loc.id} value={loc.id}>
                                    {loc.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={completeLine.isPending}
                            onClick={() => completeLine.mutate(line.id)}
                          >
                            <CheckCircle2 /> Pick
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
