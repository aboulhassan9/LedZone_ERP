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
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import {
  createPayrollRecordSchema,
  type CreatePayrollRecordInput,
} from "@/modules/hr/schemas/payroll-record-schema";
import { createPayrollRecordAction } from "@/modules/hr/actions/employee-actions";
import type { CurrencyOption } from "@/modules/hr/components/employees/employee-hr-info-dialog";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function PayrollRecordDialog({
  employeeId,
  currencies,
}: {
  employeeId: string;
  currencies: CurrencyOption[];
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const form = useForm<z.input<typeof createPayrollRecordSchema>, unknown, CreatePayrollRecordInput>({
    resolver: zodResolver(createPayrollRecordSchema),
    defaultValues: {
      payPeriodStart: todayIso(),
      payPeriodEnd: todayIso(),
      grossAmount: 0,
      deductions: 0,
      currencyCode: currencies[0]?.code ?? "",
    },
  });

  async function onSubmit(values: CreatePayrollRecordInput) {
    const result = await createPayrollRecordAction(employeeId, values);
    if (result.success) {
      toast.success("Payroll record added");
      setOpen(false);
      form.reset({
        payPeriodStart: todayIso(),
        payPeriodEnd: todayIso(),
        grossAmount: 0,
        deductions: 0,
        currencyCode: currencies[0]?.code ?? "",
      });
      router.refresh();
    } else {
      toast.error(result.error.message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus /> Add payroll record
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a payroll record</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="payPeriodStart"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Period start</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="payPeriodEnd"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Period end</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="grossAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gross amount</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} step={0.01} {...field} value={field.value as number} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="deductions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Deductions</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} step={0.01} {...field} value={field.value as number} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="currencyCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Currency</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select currency" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {currencies.map((c) => (
                        <SelectItem key={c.code} value={c.code}>
                          {c.label}
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
                {form.formState.isSubmitting ? "Adding..." : "Add record"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
