"use client";

import { useFieldArray, useFormContext } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormMessage } from "@/components/ui/form";

export function InvoiceLineItemsField() {
  const { control, register } = useFormContext();
  const { fields, append, remove } = useFieldArray({ control, name: "lineItems" });

  return (
    <div className="flex flex-col gap-2">
      {fields.map((field, index) => (
        <div key={field.id} className="flex items-end gap-2">
          <Input
            placeholder="Description"
            className="flex-1"
            {...register(`lineItems.${index}.description`)}
          />
          <Input
            type="number"
            min={1}
            step={1}
            placeholder="Qty"
            className="w-20"
            {...register(`lineItems.${index}.quantity`, { valueAsNumber: true })}
          />
          <Input
            type="number"
            min={0}
            step={0.01}
            placeholder="Unit price"
            className="w-28"
            {...register(`lineItems.${index}.unitPrice`, { valueAsNumber: true })}
          />
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={() => remove(index)}
            disabled={fields.length === 1}
          >
            <Trash2 className="text-destructive size-4" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="w-fit"
        onClick={() => append({ description: "", quantity: 1, unitPrice: 0 })}
      >
        <Plus /> Add line
      </Button>
      <FormMessage />
    </div>
  );
}
