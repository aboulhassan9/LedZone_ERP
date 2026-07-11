"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
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
  createEquipmentModelSchema,
  type CreateEquipmentModelInput,
} from "@/modules/inventory/schemas/equipment-model-schema";
import {
  createEquipmentModelAction,
  updateEquipmentModelAction,
} from "@/modules/inventory/actions/equipment-model-actions";
import type { EquipmentModelRow } from "@/modules/inventory/repositories/equipment-model-repository";
import type { EquipmentCategoryRow } from "@/modules/inventory/repositories/equipment-category-repository";
import type { ManufacturerRow } from "@/modules/inventory/repositories/manufacturer-repository";
import type { BrandRow } from "@/modules/inventory/repositories/brand-repository";

type SpecRow = { key: string; value: string };

function specsToRows(specs: Record<string, unknown> | undefined): SpecRow[] {
  if (!specs) return [];
  return Object.entries(specs).map(([key, value]) => ({ key, value: String(value) }));
}

function rowsToSpecs(rows: SpecRow[]): Record<string, string> {
  return Object.fromEntries(rows.filter((r) => r.key.trim()).map((r) => [r.key.trim(), r.value]));
}

export function EquipmentModelFormDialog({
  model,
  categories,
  manufacturers,
  brands,
  trigger,
  open: openProp,
  onOpenChange,
}: {
  model?: EquipmentModelRow;
  categories: EquipmentCategoryRow[];
  manufacturers: ManufacturerRow[];
  brands: BrandRow[];
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = openProp ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const isEdit = !!model;
  const [specRows, setSpecRows] = useState<SpecRow[]>(specsToRows(model?.specifications));

  const form = useForm<z.input<typeof createEquipmentModelSchema>, unknown, CreateEquipmentModelInput>({
    resolver: zodResolver(createEquipmentModelSchema),
    defaultValues: {
      categoryId: model?.category_id ?? "",
      manufacturerId: model?.manufacturer_id ?? "",
      brandId: model?.brand_id ?? undefined,
      modelName: model?.model_name ?? "",
      modelNumber: model?.model_number ?? undefined,
      description: model?.description ?? undefined,
      trackingType: "individual",
      specifications: model?.specifications ?? {},
      defaultWarrantyMonths: model?.default_warranty_months ?? undefined,
      expectedLifespanMonths: model?.expected_lifespan_months ?? undefined,
      imageUrl: model?.image_url ?? undefined,
    },
  });

  async function onSubmit(values: CreateEquipmentModelInput) {
    const payload = { ...values, specifications: rowsToSpecs(specRows) };
    const result = isEdit
      ? await updateEquipmentModelAction(model!.id, payload)
      : await createEquipmentModelAction(payload);

    if (result.success) {
      toast.success(isEdit ? "Model updated" : "Model created");
      setOpen(false);
      form.reset();
      setSpecRows([]);
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
              New model
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit equipment model" : "Create an equipment model"}</DialogTitle>
          <DialogDescription>
            A model is the catalog entry (e.g. &quot;Absen A3 Pro LED Panel&quot;) — individual
            units are tracked separately as Equipment Items.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
            <FormField
              control={form.control}
              name="modelName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Model name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
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
                name="modelNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Model number</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="manufacturerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Manufacturer</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select manufacturer" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {manufacturers.map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.name}
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
                name="brandId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Brand</FormLabel>
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
                        {brands.map((b) => (
                          <SelectItem key={b.id} value={b.id}>
                            {b.name}
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
                name="defaultWarrantyMonths"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default warranty (months)</FormLabel>
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
                name="expectedLifespanMonths"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expected lifespan (months)</FormLabel>
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

            <div className="grid gap-2">
              <FormLabel>Specifications</FormLabel>
              {specRows.map((row, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    placeholder="Key (e.g. pixel_pitch)"
                    value={row.key}
                    onChange={(e) =>
                      setSpecRows((rows) =>
                        rows.map((r, i) => (i === index ? { ...r, key: e.target.value } : r))
                      )
                    }
                  />
                  <Input
                    placeholder="Value"
                    value={row.value}
                    onChange={(e) =>
                      setSpecRows((rows) =>
                        rows.map((r, i) => (i === index ? { ...r, value: e.target.value } : r))
                      )
                    }
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setSpecRows((rows) => rows.filter((_, i) => i !== index))}
                  >
                    <Trash2 className="text-destructive size-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-fit"
                onClick={() => setSpecRows((rows) => [...rows, { key: "", value: "" }])}
              >
                <Plus /> Add specification
              </Button>
            </div>

            <DialogFooter>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Saving..." : isEdit ? "Save changes" : "Create model"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
