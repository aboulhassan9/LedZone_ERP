"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  createMaintenanceRecordSchema,
  type CreateMaintenanceRecordInput,
} from "@/modules/inventory/schemas/maintenance-schema";
import { createMaintenanceRecordAction } from "@/modules/inventory/actions/maintenance-incident-actions";
import type { EquipmentMaintenanceScheduleRow } from "@/modules/inventory/repositories/maintenance-repository";

export function MaintenanceRecordDialog({
  itemId,
  schedules,
  currencies,
}: {
  itemId: string;
  schedules: EquipmentMaintenanceScheduleRow[];
  currencies: { code: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const form = useForm<z.input<typeof createMaintenanceRecordSchema>, unknown, CreateMaintenanceRecordInput>({
    resolver: zodResolver(createMaintenanceRecordSchema),
    defaultValues: {
      itemId,
      maintenanceType: "",
      scheduleId: undefined,
      description: undefined,
      cost: undefined,
      currencyCode: undefined,
      technicianName: undefined,
      nextRecommendedDate: undefined,
      markItemAvailable: false,
    },
  });

  async function onSubmit(values: CreateMaintenanceRecordInput) {
    const result = await createMaintenanceRecordAction(values);
    if (result.success) {
      toast.success("Maintenance record logged");
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
        <Button size="sm">
          <Plus />
          Log maintenance
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log a maintenance record</DialogTitle>
          <DialogDescription>Records completed maintenance work on this item.</DialogDescription>
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
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {schedules.length > 0 && (
              <FormField
                control={form.control}
                name="scheduleId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Linked schedule</FormLabel>
                    <Select
                      value={field.value ?? "none"}
                      onValueChange={(value) => field.onChange(value === "none" ? undefined : value)}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="None" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {schedules.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.maintenance_type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="cost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cost</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="currencyCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Currency</FormLabel>
                    <Select
                      value={field.value ?? "none"}
                      onValueChange={(value) => field.onChange(value === "none" ? undefined : value)}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="None" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {currencies.map((c) => (
                          <SelectItem key={c.code} value={c.code}>
                            {c.code}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="technicianName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Technician</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="markItemAvailable"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center gap-2 space-y-0">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormLabel className="font-normal">Mark item as available now</FormLabel>
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Saving..." : "Log maintenance"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
