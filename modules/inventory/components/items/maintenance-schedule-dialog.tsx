"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  createMaintenanceScheduleSchema,
  type CreateMaintenanceScheduleInput,
} from "@/modules/inventory/schemas/maintenance-schema";
import { createMaintenanceScheduleAction } from "@/modules/inventory/actions/maintenance-incident-actions";

export function MaintenanceScheduleDialog({ itemId }: { itemId: string }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const form = useForm<CreateMaintenanceScheduleInput>({
    resolver: zodResolver(createMaintenanceScheduleSchema),
    defaultValues: {
      itemId,
      maintenanceType: "",
      intervalDays: 30,
      lastPerformedDate: undefined,
      nextDueDate: undefined,
    },
  });

  async function onSubmit(values: CreateMaintenanceScheduleInput) {
    const result = await createMaintenanceScheduleAction(values);
    if (result.success) {
      toast.success("Schedule created");
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
        <Button variant="outline" size="sm">
          <Plus />
          New schedule
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a maintenance schedule</DialogTitle>
          <DialogDescription>Recurring preventive maintenance for this item.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
            <FormField
              control={form.control}
              name="maintenanceType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Maintenance type</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Cleaning, calibration..." />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="intervalDays"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Interval (days)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        value={field.value}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="nextDueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Next due date</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} type="date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Saving..." : "Create schedule"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
