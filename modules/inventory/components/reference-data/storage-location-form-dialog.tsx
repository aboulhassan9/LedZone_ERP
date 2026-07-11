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
  createStorageLocationSchema,
  type CreateStorageLocationInput,
} from "@/modules/inventory/schemas/reference-data-schemas";
import {
  createStorageLocationAction,
  updateStorageLocationAction,
} from "@/modules/inventory/actions/reference-data-actions";
import type { StorageLocationRow } from "@/modules/inventory/repositories/storage-location-repository";

export function StorageLocationFormDialog({
  storageLocation,
  locations,
  trigger,
  open: openProp,
  onOpenChange,
}: {
  storageLocation?: StorageLocationRow;
  locations: { id: string; name: string }[];
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = openProp ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const isEdit = !!storageLocation;

  const form = useForm<CreateStorageLocationInput>({
    resolver: zodResolver(createStorageLocationSchema),
    defaultValues: {
      locationId: storageLocation?.location_id ?? "",
      name: storageLocation?.name ?? "",
      code: storageLocation?.code ?? undefined,
    },
  });

  async function onSubmit(values: CreateStorageLocationInput) {
    const result = isEdit
      ? await updateStorageLocationAction(storageLocation!.id, values)
      : await createStorageLocationAction(values);

    if (result.success) {
      toast.success(isEdit ? "Storage location updated" : "Storage location created");
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
              New storage location
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit storage location" : "Create a storage location"}</DialogTitle>
          <DialogDescription>
            Bin/rack/shelf granularity within one of LED Zone&apos;s sites.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
            <FormField
              control={form.control}
              name="locationId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Site</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a site" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {locations.map((l) => (
                        <SelectItem key={l.id} value={l.id}>
                          {l.name}
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
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g. Rack A3" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Code</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ""} placeholder="e.g. A3" />
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
                    : "Create storage location"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
