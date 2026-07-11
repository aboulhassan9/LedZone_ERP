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
import {
  createWarehouseLocationSchema,
  NODE_TYPES,
  LOCATION_CATEGORIES,
  type CreateWarehouseLocationInput,
} from "@/modules/warehouse/schemas/warehouse-location-schema";
import { createWarehouseLocationAction } from "@/modules/warehouse/actions/warehouse-location-actions";
import type { WarehouseLocationRow } from "@/modules/warehouse/repositories/warehouse-location-repository";

// UI hint only — mirrors WarehouseLocationService's ALLOWED_PARENT_TYPES so the type
// picker only offers sensible options; the server is still the actual enforcement point.
const CHILD_TYPES_BY_PARENT: Record<string, readonly string[]> = {
  zone: ["row"],
  row: ["rack"],
  rack: ["shelf"],
  shelf: ["bin"],
};
const TOP_LEVEL_TYPES = ["zone", "staging_area", "loading_zone", "repair_zone", "quarantine_area", "dock", "charging_station"];

export function LocationFormDialog({
  warehouseId,
  locations,
  defaultParentId,
  trigger,
}: {
  warehouseId: string;
  locations: WarehouseLocationRow[];
  defaultParentId?: string;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const form = useForm<z.input<typeof createWarehouseLocationSchema>, unknown, CreateWarehouseLocationInput>({
    resolver: zodResolver(createWarehouseLocationSchema),
    defaultValues: {
      warehouseId,
      parentId: defaultParentId,
      nodeType: "zone",
      code: "",
      name: "",
    },
  });

  const parentId = form.watch("parentId");
  const parent = locations.find((l) => l.id === parentId);
  const availableTypes = parent ? (CHILD_TYPES_BY_PARENT[parent.node_type] ?? []) : TOP_LEVEL_TYPES;

  async function onSubmit(values: CreateWarehouseLocationInput) {
    const result = await createWarehouseLocationAction(values);
    if (result.success) {
      toast.success(`Location "${result.data.full_code}" created`);
      setOpen(false);
      form.reset({ warehouseId, nodeType: "zone", code: "", name: "" });
      router.refresh();
    } else {
      toast.error(result.error.message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm">
            <Plus />
            New location
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a location</DialogTitle>
          <DialogDescription>Add a node to this warehouse&apos;s layout.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
            <FormField
              control={form.control}
              name="parentId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Parent location</FormLabel>
                  <Select
                    value={field.value ?? "none"}
                    onValueChange={(value) => field.onChange(value === "none" ? undefined : value)}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="None (top-level)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">None (top-level)</SelectItem>
                      {locations.map((l) => (
                        <SelectItem key={l.id} value={l.id}>
                          {l.full_code} ({l.node_type})
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
              name="nodeType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(availableTypes.length ? availableTypes : NODE_TYPES).map((t) => (
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
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Code</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g. B04" />
                    </FormControl>
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
                      <Input {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="locationCategory"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
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
                      {LOCATION_CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c.replace(/_/g, " ")}
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
                name="capacityUnits"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Capacity (units)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
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
                name="weightLimitKg"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Weight limit (kg)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Creating..." : "Create location"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
