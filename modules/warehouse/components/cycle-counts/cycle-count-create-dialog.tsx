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
import { LineItemsField, type LineItemOption } from "@/modules/warehouse/components/line-items-field";
import {
  createCycleCountSchema,
  CYCLE_COUNT_SCOPE_TYPES,
  type CreateCycleCountInput,
} from "@/modules/warehouse/schemas/warehouse-cycle-count-schema";
import { createCycleCountAction } from "@/modules/warehouse/actions/cycle-count-actions";
import type { WarehouseRow } from "@/modules/warehouse/repositories/warehouse-repository";

export function CycleCountCreateDialog({
  warehouses,
  items,
  consumableModels,
}: {
  warehouses: WarehouseRow[];
  items: LineItemOption[];
  consumableModels: LineItemOption[];
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const form = useForm<z.input<typeof createCycleCountSchema>, unknown, CreateCycleCountInput>({
    resolver: zodResolver(createCycleCountSchema),
    defaultValues: {
      warehouseId: "",
      scopeType: "random",
      lines: [{ itemId: undefined, modelId: undefined, expectedQty: 0 }],
    },
  });

  async function onSubmit(values: CreateCycleCountInput) {
    const result = await createCycleCountAction(values);
    if (result.success) {
      toast.success("Cycle count created");
      setOpen(false);
      form.reset({ warehouseId: "", scopeType: "random", lines: [{ expectedQty: 0 }] });
      router.push(`/warehouse/cycle-counts/${result.data.cycleCount.id}`);
    } else {
      toast.error(result.error.message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus />
          New cycle count
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>New cycle count</DialogTitle>
          <DialogDescription>Schedule a count and record expected quantities.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="warehouseId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Warehouse</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select warehouse" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
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
              <FormField
                control={form.control}
                name="scopeType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Scope</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CYCLE_COUNT_SCOPE_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>
                            {t}
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
                name="scheduledDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Scheduled date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid gap-2">
              <FormLabel>Lines</FormLabel>
              <LineItemsField
                name="lines"
                items={items}
                consumableModels={consumableModels}
                quantityField="expectedQty"
                quantityLabel="Expected qty"
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Creating..." : "Create cycle count"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
