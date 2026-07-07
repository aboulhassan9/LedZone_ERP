"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
  createDispatchSchema,
  DISPATCH_DESTINATION_TYPES,
  type CreateDispatchInput,
} from "@/modules/warehouse/schemas/warehouse-dispatch-schema";
import { createDispatchAction } from "@/modules/warehouse/actions/dispatch-actions";
import type { WarehouseRow } from "@/modules/warehouse/repositories/warehouse-repository";

export function DispatchCreateDialog({
  warehouses,
  items,
  consumableModels,
  locations,
}: {
  warehouses: WarehouseRow[];
  items: LineItemOption[];
  consumableModels: LineItemOption[];
  locations: LineItemOption[];
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const form = useForm<z.input<typeof createDispatchSchema>, unknown, CreateDispatchInput>({
    resolver: zodResolver(createDispatchSchema),
    defaultValues: {
      warehouseId: "",
      destinationType: "event",
      lines: [{ itemId: undefined, modelId: undefined, quantity: undefined }],
    },
  });

  async function onSubmit(values: CreateDispatchInput) {
    const result = await createDispatchAction(values);
    if (result.success) {
      toast.success("Dispatch record created");
      setOpen(false);
      form.reset({ warehouseId: "", destinationType: "event", lines: [{}] });
      router.push(`/warehouse/dispatch/${result.data.record.id}`);
    } else {
      toast.error(result.error.message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus />
          New dispatch
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>New dispatch record</DialogTitle>
          <DialogDescription>Send equipment/consumables out of a warehouse.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
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
                name="destinationType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Destination type</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {DISPATCH_DESTINATION_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>
                            {t.replace(/_/g, " ")}
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
              name="destinationReference"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Destination reference</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ""} placeholder="Event name, customer, repair ticket..." />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid gap-2">
              <FormLabel>Lines</FormLabel>
              <LineItemsField
                name="lines"
                items={items}
                consumableModels={consumableModels}
                locations={locations}
                locationField="sourceWarehouseLocationId"
                locationLabel="Source location"
              />
            </div>
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
                {form.formState.isSubmitting ? "Creating..." : "Create dispatch record"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
