"use client";

import { useFieldArray, useFormContext } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormMessage } from "@/components/ui/form";

export type LineItemOption = { id: string; label: string };

// Reusable RHF field-array editor for the {itemId|modelId, quantity} line shape shared by
// transfers/receiving/dispatch/picking/cycle counts. `name` is the field-array path on the
// parent form (e.g. "lines"). `locationField` optionally renders a per-line location picker
// (e.g. "destinationWarehouseLocationId" for receiving, "sourceWarehouseLocationId" for
// dispatch) — the transactional RPCs that place/dispatch a line require it to be set.
export function LineItemsField({
  name,
  items,
  consumableModels,
  showQuantityForItems = false,
  locations,
  locationField,
  locationLabel = "Location",
  showCondition = false,
  quantityField = "quantity",
  quantityLabel = "Qty",
}: {
  name: string;
  items: LineItemOption[];
  consumableModels: LineItemOption[];
  showQuantityForItems?: boolean;
  locations?: LineItemOption[];
  locationField?: string;
  locationLabel?: string;
  showCondition?: boolean;
  quantityField?: string;
  quantityLabel?: string;
}) {
  const { control, register, watch, setValue } = useFormContext();
  const { fields, append, remove } = useFieldArray({ control, name });

  return (
    <div className="grid gap-3">
      {fields.map((field, index) => {
        const kind = watch(`${name}.${index}.modelId`) ? "consumable" : "item";

        return (
          <div key={field.id} className="grid gap-2 rounded-md border p-2">
            <div className="grid grid-cols-[110px_1fr_auto_auto] items-start gap-2">
              <Select
                value={kind}
                onValueChange={(value) => {
                  setValue(`${name}.${index}.itemId`, undefined);
                  setValue(`${name}.${index}.modelId`, undefined);
                  if (quantityField === "quantity") {
                    setValue(`${name}.${index}.quantity`, value === "consumable" ? 1 : undefined);
                  }
                }}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="item">Equipment</SelectItem>
                  <SelectItem value="consumable">Consumable</SelectItem>
                </SelectContent>
              </Select>

              {kind === "item" ? (
                <Select
                  value={watch(`${name}.${index}.itemId`) ?? ""}
                  onValueChange={(value) => setValue(`${name}.${index}.itemId`, value)}
                >
                  <SelectTrigger className="h-9 w-full">
                    <SelectValue placeholder="Select an item" />
                  </SelectTrigger>
                  <SelectContent>
                    {items.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Select
                  value={watch(`${name}.${index}.modelId`) ?? ""}
                  onValueChange={(value) => setValue(`${name}.${index}.modelId`, value)}
                >
                  <SelectTrigger className="h-9 w-full">
                    <SelectValue placeholder="Select a consumable" />
                  </SelectTrigger>
                  <SelectContent>
                    {consumableModels.map((model) => (
                      <SelectItem key={model.id} value={model.id}>
                        {model.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {kind === "consumable" || showQuantityForItems || quantityField !== "quantity" ? (
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder={quantityLabel}
                  className="h-9 w-24"
                  {...register(`${name}.${index}.${quantityField}`, { valueAsNumber: true })}
                />
              ) : (
                <div />
              )}

              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-9"
                onClick={() => remove(index)}
                disabled={fields.length === 1}
              >
                <Trash2 className="text-destructive size-4" />
              </Button>
            </div>

            {(locationField ?? showCondition) && (
              <div className="grid grid-cols-2 gap-2">
                {locationField && locations && (
                  <Select
                    value={watch(`${name}.${index}.${locationField}`) ?? ""}
                    onValueChange={(value) => setValue(`${name}.${index}.${locationField}`, value)}
                  >
                    <SelectTrigger className="h-9 w-full">
                      <SelectValue placeholder={locationLabel} />
                    </SelectTrigger>
                    <SelectContent>
                      {locations.map((loc) => (
                        <SelectItem key={loc.id} value={loc.id}>
                          {loc.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {showCondition && (
                  <Input
                    placeholder="Condition on arrival"
                    className="h-9"
                    {...register(`${name}.${index}.conditionOnArrival`)}
                  />
                )}
              </div>
            )}
          </div>
        );
      })}
      <FormMessage />
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-fit"
        onClick={() => append({ itemId: undefined, modelId: undefined, quantity: undefined })}
      >
        <Plus /> Add line
      </Button>
    </div>
  );
}
