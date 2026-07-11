"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { createVehicleSchema, type CreateVehicleInput } from "@/modules/planning/schemas/resource-assignment-schema";
import { createVehicleAction, updateVehicleAction } from "@/modules/planning/actions/resource-actions";
import type { VehicleRow } from "@/modules/planning/repositories/resource-assignment-repository";

export function VehicleFormDialog({
  vehicle,
  trigger,
  open: openProp,
  onOpenChange,
}: {
  vehicle?: VehicleRow;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = openProp ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const isEdit = !!vehicle;

  const form = useForm<CreateVehicleInput>({
    resolver: zodResolver(createVehicleSchema),
    defaultValues: {
      name: vehicle?.name ?? "",
      plateNumber: vehicle?.plate_number ?? undefined,
      vehicleType: vehicle?.vehicle_type ?? undefined,
      capacityNotes: vehicle?.capacity_notes ?? undefined,
    },
  });

  async function onSubmit(values: CreateVehicleInput) {
    const result = isEdit ? await updateVehicleAction(vehicle!.id, values) : await createVehicleAction(values);

    if (result.success) {
      toast.success(isEdit ? "Vehicle updated" : "Vehicle added");
      setOpen(false);
      form.reset();
    } else {
      toast.error(result.error.message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!isEdit && (
        <DialogTrigger asChild>
          {trigger ?? (
            <Button>
              <Plus />
              New vehicle
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit vehicle" : "Add a vehicle"}</DialogTitle>
          <DialogDescription>Kept minimal — just enough to book it against a plan.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g. Delivery Truck 1" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="plateNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Plate number</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="vehicleType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ""} placeholder="e.g. Box truck, Pickup, Van" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="capacityNotes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Capacity notes</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ""} placeholder="e.g. 3 tons, 12 m3" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Saving..." : isEdit ? "Save changes" : "Add vehicle"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
