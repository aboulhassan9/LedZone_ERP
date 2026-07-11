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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  createManufacturerSchema,
  type CreateManufacturerInput,
} from "@/modules/inventory/schemas/reference-data-schemas";
import {
  createManufacturerAction,
  updateManufacturerAction,
} from "@/modules/inventory/actions/reference-data-actions";
import type { ManufacturerRow } from "@/modules/inventory/repositories/manufacturer-repository";

export function ManufacturerFormDialog({
  manufacturer,
  trigger,
  open: openProp,
  onOpenChange,
}: {
  manufacturer?: ManufacturerRow;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = openProp ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const isEdit = !!manufacturer;

  const form = useForm<CreateManufacturerInput>({
    resolver: zodResolver(createManufacturerSchema),
    defaultValues: {
      name: manufacturer?.name ?? "",
      country: manufacturer?.country ?? undefined,
      website: manufacturer?.website ?? undefined,
      supportEmail: manufacturer?.support_email ?? undefined,
      supportPhone: manufacturer?.support_phone ?? undefined,
    },
  });

  async function onSubmit(values: CreateManufacturerInput) {
    const result = isEdit
      ? await updateManufacturerAction(manufacturer!.id, values)
      : await createManufacturerAction(values);

    if (result.success) {
      toast.success(isEdit ? "Manufacturer updated" : "Manufacturer created");
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
              New manufacturer
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit manufacturer" : "Create a manufacturer"}</DialogTitle>
          <DialogDescription>Manufacturers back equipment models and brands.</DialogDescription>
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
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="country"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Country</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="website"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Website</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ""} placeholder="https://" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="supportEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Support email</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ""} type="email" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="supportPhone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Support phone</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting
                  ? "Saving..."
                  : isEdit
                    ? "Save changes"
                    : "Create manufacturer"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
