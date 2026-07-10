"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Users, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import {
  assignCrewSchema,
  assignVehicleSchema,
  type AssignCrewInput,
  type AssignVehicleInput,
} from "@/modules/planning/schemas/resource-assignment-schema";
import { assignCrewAction, assignVehicleAction, removeAssignmentAction } from "@/modules/planning/actions/resource-actions";
import type { ResourceAssignmentRow, CrewMemberRow, VehicleRow } from "@/modules/planning/repositories/resource-assignment-repository";

function toDatetimeLocal(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function AssignCrewDialog({
  planId,
  crewMembers,
  defaultStart,
  defaultEnd,
}: {
  planId: string;
  crewMembers: CrewMemberRow[];
  defaultStart: string;
  defaultEnd: string;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const form = useForm<z.input<typeof assignCrewSchema>, unknown, AssignCrewInput>({
    resolver: zodResolver(assignCrewSchema),
    defaultValues: { crewMemberId: "", scheduledStartAt: defaultStart, scheduledEndAt: defaultEnd },
  });

  async function onSubmit(values: AssignCrewInput) {
    const result = await assignCrewAction(planId, {
      ...values,
      scheduledStartAt: new Date(values.scheduledStartAt).toISOString(),
      scheduledEndAt: new Date(values.scheduledEndAt).toISOString(),
    });
    if (result.success) {
      toast.success("Crew assigned");
      setOpen(false);
      form.reset();
      router.refresh();
    } else {
      toast.error(result.error.message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus /> Assign crew
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign crew</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
            <FormField
              control={form.control}
              name="crewMemberId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Crew member</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select crew member" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {crewMembers.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.full_name}
                          {c.role ? ` — ${c.role}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="roleOrPurpose"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role / purpose</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ""} placeholder="e.g. Rigger" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="scheduledStartAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="scheduledEndAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                Assign
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function AssignVehicleDialog({
  planId,
  vehicles,
  defaultStart,
  defaultEnd,
}: {
  planId: string;
  vehicles: VehicleRow[];
  defaultStart: string;
  defaultEnd: string;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const form = useForm<z.input<typeof assignVehicleSchema>, unknown, AssignVehicleInput>({
    resolver: zodResolver(assignVehicleSchema),
    defaultValues: { vehicleId: "", scheduledStartAt: defaultStart, scheduledEndAt: defaultEnd },
  });

  async function onSubmit(values: AssignVehicleInput) {
    const result = await assignVehicleAction(planId, {
      ...values,
      scheduledStartAt: new Date(values.scheduledStartAt).toISOString(),
      scheduledEndAt: new Date(values.scheduledEndAt).toISOString(),
    });
    if (result.success) {
      toast.success("Vehicle assigned");
      setOpen(false);
      form.reset();
      router.refresh();
    } else {
      toast.error(result.error.message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus /> Assign vehicle
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign vehicle</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
            <FormField
              control={form.control}
              name="vehicleId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vehicle</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select vehicle" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {vehicles.map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.name}
                          {v.plate_number ? ` (${v.plate_number})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="roleOrPurpose"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Purpose</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ""} placeholder="e.g. Delivery truck" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="scheduledStartAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="scheduledEndAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                Assign
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export function ResourceAssignmentPanel({
  planId,
  assignments,
  crewMembers,
  vehicles,
  eventStartAt,
  eventEndAt,
}: {
  planId: string;
  assignments: ResourceAssignmentRow[];
  crewMembers: CrewMemberRow[];
  vehicles: VehicleRow[];
  eventStartAt: string;
  eventEndAt: string;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const crewNames = Object.fromEntries(crewMembers.map((c) => [c.id, c.full_name]));
  const vehicleNames = Object.fromEntries(vehicles.map((v) => [v.id, v.name]));

  const removeMutation = useMutation({
    mutationFn: (id: string) => removeAssignmentAction(id, planId),
    onSuccess: (result) => {
      if (result.success) {
        toast.success("Assignment removed");
        queryClient.invalidateQueries({ queryKey: ["equipment-plan"] });
        router.refresh();
      } else {
        toast.error(result.error.message);
      }
    },
  });

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="text-base">Crew &amp; vehicles</CardTitle>
        <div className="flex gap-2">
          <AssignCrewDialog
            planId={planId}
            crewMembers={crewMembers}
            defaultStart={toDatetimeLocal(new Date(eventStartAt))}
            defaultEnd={toDatetimeLocal(new Date(eventEndAt))}
          />
          <AssignVehicleDialog
            planId={planId}
            vehicles={vehicles}
            defaultStart={toDatetimeLocal(new Date(eventStartAt))}
            defaultEnd={toDatetimeLocal(new Date(eventEndAt))}
          />
        </div>
      </CardHeader>
      <CardContent>
        {assignments.length === 0 ? (
          <p className="text-muted-foreground text-sm">No crew or vehicles assigned yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Resource</TableHead>
                <TableHead>Purpose</TableHead>
                <TableHead>Window</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignments.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="flex items-center gap-2 font-medium">
                    {a.resource_type === "crew" ? <Users className="size-4" /> : <Truck className="size-4" />}
                    {a.resource_type === "crew"
                      ? crewNames[a.crew_member_id ?? ""] ?? "—"
                      : vehicleNames[a.vehicle_id ?? ""] ?? "—"}
                  </TableCell>
                  <TableCell>{a.role_or_purpose ?? "—"}</TableCell>
                  <TableCell className="text-sm">
                    {new Date(a.scheduled_start_at).toLocaleString()} – {new Date(a.scheduled_end_at).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="icon"
                      variant="ghost"
                      disabled={removeMutation.isPending}
                      onClick={() => removeMutation.mutate(a.id)}
                    >
                      <Trash2 className="text-destructive size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
