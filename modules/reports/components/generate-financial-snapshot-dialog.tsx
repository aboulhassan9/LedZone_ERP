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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import {
  generateFinancialSnapshotSchema,
  PERIOD_TYPES,
  type GenerateFinancialSnapshotInput,
} from "@/modules/reports/schemas/financial-snapshot-schema";
import { generateFinancialSnapshotAction } from "@/modules/reports/actions/financial-snapshot-actions";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function GenerateFinancialSnapshotDialog() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const form = useForm<z.input<typeof generateFinancialSnapshotSchema>, unknown, GenerateFinancialSnapshotInput>({
    resolver: zodResolver(generateFinancialSnapshotSchema),
    defaultValues: { periodType: "weekly", referenceDate: todayIso() },
  });

  async function onSubmit(values: GenerateFinancialSnapshotInput) {
    const result = await generateFinancialSnapshotAction(values);
    if (result.success) {
      toast.success(
        result.data.length > 0
          ? `Report generated (${result.data.length} currenc${result.data.length === 1 ? "y" : "ies"})`
          : "No income or expenses found for that period"
      );
      setOpen(false);
      router.refresh();
    } else {
      toast.error(result.error.message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus />
          Generate report
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generate a financial report</DialogTitle>
          <DialogDescription>
            Income (payments actually received) vs. approved/paid expenses for the week or month
            containing the date below. Re-generating an existing period overwrites it.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
            <FormField
              control={form.control}
              name="periodType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Period</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {PERIOD_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t === "weekly" ? "Weekly (Mon-Sun)" : "Monthly"}
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
              name="referenceDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Any date within the period</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Generating..." : "Generate"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
