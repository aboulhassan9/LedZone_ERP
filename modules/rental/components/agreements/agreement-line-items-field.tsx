"use client";

import { useFieldArray, useFormContext } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormMessage } from "@/components/ui/form";

export type ModelOption = { id: string; label: string };

export function AgreementLineItemsField({ models }: { models: ModelOption[] }) {
  const { control, register, watch, setValue } = useFormContext();
  const { fields, append, remove } = useFieldArray({ control, name: "lineItems" });

  return (
    <div className="flex flex-col gap-2">
      {fields.map((field, index) => (
        <div key={field.id} className="flex items-end gap-2">
          <div className="flex-1">
            <Select
              value={watch(`lineItems.${index}.modelId`)}
              onValueChange={(value) => setValue(`lineItems.${index}.modelId`, value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Model" />
              </SelectTrigger>
              <SelectContent>
                {models.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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
            placeholder="Daily rate"
            className="w-28"
            {...register(`lineItems.${index}.dailyRate`, { valueAsNumber: true })}
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
        onClick={() => append({ modelId: "", quantity: 1, dailyRate: 0 })}
      >
        <Plus /> Add line
      </Button>
      <FormMessage />
    </div>
  );
}
