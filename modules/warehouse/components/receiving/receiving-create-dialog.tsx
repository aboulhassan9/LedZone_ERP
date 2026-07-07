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
  createReceivingSchema,
  RECEIVING_SOURCE_TYPES,
  type CreateReceivingInput,
} from "@/modules/warehouse/schemas/warehouse-receiving-schema";
import { createReceivingAction } from "@/modules/warehouse/actions/receiving-actions";
import type { WarehouseRow } from "@/modules/warehouse/repositories/warehouse-repository";

export function ReceivingCreateDialog({
  warehouses,
  purchases,
  items,
  consumableModels,
  locations,
}: {
  warehouses: WarehouseRow[];
  purchases: { id: string; invoice_number: string | null }[];
  items: LineItemOption[];
  consumableModels: LineItemOption[];
  locations: LineItemOption[];
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const form = useForm<z.input<typeof createReceivingSchema>, unknown, CreateReceivingInput>({
    resolver: zodResolver(createReceivingSchema),
    defaultValues: {
      warehouseId: "",
      sourceType: "manual",
      lines: [{ itemId: undefined, modelId: undefined, quantity: undefined }],
    },
  });

  const sourceType = form.watch("sourceType");

  async function onSubmit(values: CreateReceivingInput) {
    const result = await createReceivingAction(values);
    if (result.success) {
      toast.success("Receiving record created");
      setOpen(false);
      form.reset({ warehouseId: "", sourceType: "manual", lines: [{}] });
      router.push(`/warehouse/receiving/${result.data.record.id}`);
    } else {
      toast.error(result.error.message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus />
          New receiving
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>New receiving document</DialogTitle>
          <DialogDescription>Record equipment/consumables arriving into a warehouse.</DialogDescription>
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
                name="sourceType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Source</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {RECEIVING_SOURCE_TYPES.map((t) => (
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
            {sourceType === "purchase_order" && (
              <FormField
                control={form.control}
                name="purchaseId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Purchase</FormLabel>
                    <Select value={field.value ?? ""} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select purchase" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {purchases.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.invoice_number ?? p.id}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <div className="grid gap-2">
              <FormLabel>Lines</FormLabel>
              <LineItemsField
                name="lines"
                items={items}
                consumableModels={consumableModels}
                locations={locations}
                locationField="destinationWarehouseLocationId"
                locationLabel="Destination"
                showCondition
              />
            </div>
            <FormField
              control={form.control}
              name="referenceNote"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reference note</FormLabel>
                  <FormControl>
                    <Textarea {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Creating..." : "Create receiving record"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
