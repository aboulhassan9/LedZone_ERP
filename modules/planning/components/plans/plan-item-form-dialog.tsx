"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { createPlanItemSchema, type CreatePlanItemInput } from "@/modules/planning/schemas/plan-item-schema";
import { addPlanItemAction, getAvailabilityAction } from "@/modules/planning/actions/plan-actions";
import type { EquipmentPlanRow } from "@/modules/planning/repositories/equipment-plan-repository";
import type { WarehouseRow } from "@/modules/warehouse/repositories/warehouse-repository";

export type ModelOption = { id: string; label: string };

export function PlanItemFormDialog({
  plan,
  models,
  warehouses,
}: {
  plan: EquipmentPlanRow;
  models: ModelOption[];
  warehouses: WarehouseRow[];
}) {
  const [open, setOpen] = useState(false);
  const [availability, setAvailability] = useState<{ available: number; pool: number } | null>(null);
  const router = useRouter();

  const form = useForm<z.input<typeof createPlanItemSchema>, unknown, CreatePlanItemInput>({
    resolver: zodResolver(createPlanItemSchema),
    defaultValues: { modelId: "", quantityRequested: 1 },
  });

  const modelId = form.watch("modelId");
  const warehouseId = form.watch("warehouseId");

  useEffect(() => {
    if (!modelId) {
      setAvailability(null);
      return;
    }
    let cancelled = false;
    getAvailabilityAction({
      modelId,
      warehouseId: warehouseId || undefined,
      startAt: plan.event_start_at,
      endAt: plan.event_end_at,
      excludePlanId: plan.id,
    }).then((result) => {
      if (cancelled) return;
      if (result.success) {
        setAvailability({ available: result.data.availableQuantity, pool: result.data.eligiblePoolSize });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [modelId, warehouseId, plan.event_start_at, plan.event_end_at, plan.id]);

  async function onSubmit(values: CreatePlanItemInput) {
    const result = await addPlanItemAction(plan.id, values);
    if (result.success) {
      toast.success("Item added");
      setOpen(false);
      form.reset({ modelId: "", quantityRequested: 1 });
      setAvailability(null);
      router.refresh();
    } else {
      toast.error(result.error.message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus />
          Add item
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add a demand line</DialogTitle>
          <DialogDescription>Model-level quantity — specific serials are assigned at Prepare.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
            <FormField
              control={form.control}
              name="modelId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Equipment model</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select model" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {models.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="quantityRequested"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantity</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} step={1} {...field} value={field.value as number} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="warehouseId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Warehouse</FormLabel>
                    <Select
                      value={field.value ?? "any"}
                      onValueChange={(value) => field.onChange(value === "any" ? undefined : value)}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Any" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="any">Any warehouse</SelectItem>
                        {warehouses.map((w) => (
                          <SelectItem key={w.id} value={w.id}>
                            {w.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            {availability && (
              <p className="text-muted-foreground text-sm">
                <span className={availability.available >= Number(form.watch("quantityRequested") || 0) ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
                  {availability.available} of {availability.pool}
                </span>{" "}
                available for this window
                {warehouseId ? " at the selected warehouse" : " across all warehouses"}.
              </p>
            )}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Adding..." : "Add item"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
