"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { deletePlanItemAction } from "@/modules/planning/actions/plan-actions";
import type { EquipmentPlanItemRow } from "@/modules/planning/repositories/equipment-plan-repository";

export function PlanItemList({
  items,
  modelNames,
  warehouseNames,
  editable,
}: {
  items: EquipmentPlanItemRow[];
  modelNames: Record<string, string>;
  warehouseNames: Record<string, string>;
  editable: boolean;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deletePlanItemAction(id, items.find((i) => i.id === id)?.plan_id ?? ""),
    onSuccess: (result) => {
      if (result.success) {
        toast.success("Item removed");
        queryClient.invalidateQueries({ queryKey: ["equipment-plan"] });
        router.refresh();
      } else {
        toast.error(result.error.message);
      }
    },
  });

  if (items.length === 0) {
    return <p className="text-muted-foreground text-sm">No demand lines yet.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Model</TableHead>
          <TableHead>Quantity</TableHead>
          <TableHead>Warehouse</TableHead>
          <TableHead>Notes</TableHead>
          {editable && <TableHead className="w-10" />}
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => (
          <TableRow key={item.id}>
            <TableCell className="font-medium">{modelNames[item.model_id] ?? item.model_id}</TableCell>
            <TableCell>{item.quantity_requested}</TableCell>
            <TableCell>{item.warehouse_id ? warehouseNames[item.warehouse_id] ?? "—" : "Any"}</TableCell>
            <TableCell className="text-muted-foreground">{item.notes ?? "—"}</TableCell>
            {editable && (
              <TableCell>
                <Button
                  size="icon"
                  variant="ghost"
                  disabled={deleteMutation.isPending}
                  onClick={() => deleteMutation.mutate(item.id)}
                >
                  <Trash2 className="text-destructive size-4" />
                </Button>
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
