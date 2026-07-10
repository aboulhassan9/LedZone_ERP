"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { CheckCircle2, ClipboardCheck, PackageCheck, Truck, FlagTriangleRight, RotateCcw, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { PlanStatusBadge } from "@/modules/planning/components/status-badge";
import { PlanItemFormDialog, type ModelOption } from "@/modules/planning/components/plans/plan-item-form-dialog";
import { PlanItemList } from "@/modules/planning/components/plans/plan-item-list";
import { ConflictPanel } from "@/modules/planning/components/plans/conflict-panel";
import { ResourceAssignmentPanel } from "@/modules/planning/components/plans/resource-assignment-panel";
import { useAuth } from "@/providers/auth-provider";
import {
  submitToReadyAction,
  revertToPlanningAction,
  approvePlanAction,
  preparePlanAction,
  loadPlanAction,
  completePlanAction,
  cancelPlanAction,
} from "@/modules/planning/actions/workflow-actions";
import type { EquipmentPlanRow, EquipmentPlanItemRow } from "@/modules/planning/repositories/equipment-plan-repository";
import type { EquipmentConflictRow, EquipmentShortageRow } from "@/modules/planning/repositories/equipment-conflict-repository";
import type { ResourceAssignmentRow, CrewMemberRow, VehicleRow } from "@/modules/planning/repositories/resource-assignment-repository";
import type { WarehouseRow } from "@/modules/warehouse/repositories/warehouse-repository";

function CancelDialog({ onConfirm, disabled }: { onConfirm: (reason: string) => void; disabled: boolean }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" disabled={disabled}>
          <Ban /> Cancel
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel plan</DialogTitle>
          <DialogDescription>Releases any reservations already made. Optional reason.</DialogDescription>
        </DialogHeader>
        <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason..." />
        <DialogFooter>
          <Button
            variant="destructive"
            onClick={() => {
              onConfirm(reason);
              setOpen(false);
              setReason("");
            }}
          >
            Confirm cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function PlanDetail({
  plan,
  items,
  conflicts,
  shortages,
  assignments,
  crewMembers,
  vehicles,
  models,
  warehouses,
  modelNames,
  warehouseNames,
  customerName,
  eventName,
}: {
  plan: EquipmentPlanRow;
  items: EquipmentPlanItemRow[];
  conflicts: EquipmentConflictRow[];
  shortages: EquipmentShortageRow[];
  assignments: ResourceAssignmentRow[];
  crewMembers: CrewMemberRow[];
  vehicles: VehicleRow[];
  models: ModelOption[];
  warehouses: WarehouseRow[];
  modelNames: Record<string, string>;
  warehouseNames: Record<string, string>;
  customerName: string | null;
  eventName: string | null;
}) {
  const { hasPermission } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  const canUpdate = hasPermission("planning.manage") || hasPermission("planning.update");
  const canApprove = hasPermission("planning.manage") || hasPermission("planning.approve");
  const canPrepare = hasPermission("planning.manage") || hasPermission("planning.prepare");
  const canLoad = hasPermission("planning.manage") || hasPermission("planning.load");
  const canComplete = hasPermission("planning.manage") || hasPermission("planning.complete");
  const canCancel = hasPermission("planning.manage") || hasPermission("planning.cancel");

  function afterMutation() {
    queryClient.invalidateQueries({ queryKey: ["equipment-plan"] });
    router.refresh();
  }

  function useWorkflow(fn: () => Promise<{ success: boolean; error?: { message: string } }>, successMessage: string) {
    return useMutation({
      mutationFn: fn,
      onSuccess: (result) => {
        if (result.success) {
          toast.success(successMessage);
          afterMutation();
        } else {
          toast.error(result.error?.message ?? "Something went wrong");
        }
      },
    });
  }

  const readyMutation = useWorkflow(() => submitToReadyAction(plan.id), "Plan marked ready");
  const revertMutation = useWorkflow(() => revertToPlanningAction(plan.id), "Reverted to planning");
  const approveMutation = useWorkflow(() => approvePlanAction(plan.id), "Plan approved");
  const prepareMutation = useWorkflow(() => preparePlanAction(plan.id), "Plan prepared — items reserved");
  const loadMutation = useWorkflow(() => loadPlanAction(plan.id), "Plan loaded");
  const completeMutation = useWorkflow(() => completePlanAction(plan.id), "Plan completed");
  const cancelMutation = useMutation({
    mutationFn: (reason: string) => cancelPlanAction(plan.id, { reason: reason || undefined }),
    onSuccess: (result) => {
      if (result.success) {
        toast.success("Plan cancelled");
        afterMutation();
      } else {
        toast.error(result.error.message);
      }
    },
  });

  const editableItems = plan.status === "draft" || plan.status === "planning" || plan.status === "ready";
  const cancellable = !["loaded", "completed", "cancelled"].includes(plan.status);

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            {plan.name}
            <PlanStatusBadge status={plan.status} />
          </CardTitle>
          <div className="flex flex-wrap gap-2">
            {canUpdate && (plan.status === "draft" || plan.status === "planning") && (
              <Button size="sm" disabled={readyMutation.isPending} onClick={() => readyMutation.mutate()}>
                <FlagTriangleRight /> Mark ready
              </Button>
            )}
            {canUpdate && plan.status === "ready" && (
              <Button size="sm" variant="outline" disabled={revertMutation.isPending} onClick={() => revertMutation.mutate()}>
                <RotateCcw /> Back to planning
              </Button>
            )}
            {canApprove && plan.status === "ready" && (
              <Button size="sm" disabled={approveMutation.isPending} onClick={() => approveMutation.mutate()}>
                <CheckCircle2 /> Approve
              </Button>
            )}
            {canPrepare && plan.status === "approved" && (
              <Button size="sm" disabled={prepareMutation.isPending} onClick={() => prepareMutation.mutate()}>
                <ClipboardCheck /> Prepare
              </Button>
            )}
            {canLoad && plan.status === "prepared" && (
              <Button size="sm" disabled={loadMutation.isPending} onClick={() => loadMutation.mutate()}>
                <Truck /> Load
              </Button>
            )}
            {canComplete && plan.status === "loaded" && (
              <Button size="sm" disabled={completeMutation.isPending} onClick={() => completeMutation.mutate()}>
                <PackageCheck /> Complete
              </Button>
            )}
            {canCancel && cancellable && (
              <CancelDialog onConfirm={(reason) => cancelMutation.mutate(reason)} disabled={cancelMutation.isPending} />
            )}
          </div>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
            <div>
              <dt className="text-muted-foreground">Event window</dt>
              <dd className="font-medium">
                {new Date(plan.event_start_at).toLocaleString()} – {new Date(plan.event_end_at).toLocaleString()}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Warehouse</dt>
              <dd className="font-medium">
                {plan.primary_warehouse_id ? warehouseNames[plan.primary_warehouse_id] ?? "—" : "Any"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Customer</dt>
              <dd className="font-medium">{customerName ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Event</dt>
              <dd className="font-medium">{eventName ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Approved</dt>
              <dd className="font-medium">{plan.approved_at ? new Date(plan.approved_at).toLocaleString() : "—"}</dd>
            </div>
          </dl>
          {plan.notes && <p className="text-muted-foreground mt-4 text-sm">{plan.notes}</p>}
        </CardContent>
      </Card>

      <ConflictPanel conflicts={conflicts} shortages={shortages} items={items} modelNames={modelNames} />

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base">Demand lines</CardTitle>
          {canUpdate && editableItems && <PlanItemFormDialog plan={plan} models={models} warehouses={warehouses} />}
        </CardHeader>
        <CardContent>
          <PlanItemList items={items} modelNames={modelNames} warehouseNames={warehouseNames} editable={canUpdate && editableItems} />
        </CardContent>
      </Card>

      <ResourceAssignmentPanel
        planId={plan.id}
        assignments={assignments}
        crewMembers={crewMembers}
        vehicles={vehicles}
        eventStartAt={plan.event_start_at}
        eventEndAt={plan.event_end_at}
      />
    </div>
  );
}
