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
  createTransferRequestSchema,
  type CreateTransferRequestInput,
} from "@/modules/warehouse/schemas/warehouse-transfer-schema";
import { createTransferRequestAction } from "@/modules/warehouse/actions/warehouse-transfer-actions";
import type { WarehouseRow } from "@/modules/warehouse/repositories/warehouse-repository";
import type { WarehouseLocationRow } from "@/modules/warehouse/repositories/warehouse-location-repository";

export function TransferCreateDialog({
  warehouses,
  locations,
  items,
  consumableModels,
}: {
  warehouses: WarehouseRow[];
  locations: WarehouseLocationRow[];
  items: LineItemOption[];
  consumableModels: LineItemOption[];
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const form = useForm<z.input<typeof createTransferRequestSchema>, unknown, CreateTransferRequestInput>({
    resolver: zodResolver(createTransferRequestSchema),
    defaultValues: {
      fromWarehouseId: "",
      toWarehouseId: "",
      lines: [{ itemId: undefined, modelId: undefined, quantity: undefined }],
    },
  });

  const fromWarehouseId = form.watch("fromWarehouseId");
  const toWarehouseId = form.watch("toWarehouseId");

  async function onSubmit(values: CreateTransferRequestInput) {
    const result = await createTransferRequestAction(values);
    if (result.success) {
      toast.success("Transfer drafted");
      setOpen(false);
      form.reset({ fromWarehouseId: "", toWarehouseId: "", lines: [{}] });
      router.push(`/warehouse/transfers/${result.data.transfer.id}`);
    } else {
      toast.error(result.error.message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus />
          New transfer
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create a transfer request</DialogTitle>
          <DialogDescription>
            Saved as a draft — use Submit on the transfer page to send it for approval.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="fromWarehouseId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>From warehouse</FormLabel>
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
                  name="toWarehouseId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>To warehouse</FormLabel>
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
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="fromLocationId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>From location</FormLabel>
                      <Select
                        value={field.value ?? "none"}
                        onValueChange={(value) => field.onChange(value === "none" ? undefined : value)}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Any" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">Any</SelectItem>
                          {locations
                            .filter((l) => l.warehouse_id === fromWarehouseId && l.is_placeable)
                            .map((l) => (
                              <SelectItem key={l.id} value={l.id}>
                                {l.full_code}
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
                  name="toLocationId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>To location</FormLabel>
                      <Select
                        value={field.value ?? "none"}
                        onValueChange={(value) => field.onChange(value === "none" ? undefined : value)}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select destination bin" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">Unset</SelectItem>
                          {locations
                            .filter((l) => l.warehouse_id === toWarehouseId && l.is_placeable)
                            .map((l) => (
                              <SelectItem key={l.id} value={l.id}>
                                {l.full_code}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-2">
                <FormLabel>Lines</FormLabel>
                <LineItemsField name="lines" items={items} consumableModels={consumableModels} />
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
                  {form.formState.isSubmitting ? "Creating..." : "Create draft"}
                </Button>
              </DialogFooter>
            </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
