"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
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
  updateEmployeeHrInfoSchema,
  EMPLOYMENT_TYPES,
  HR_STATUSES,
  type UpdateEmployeeHrInfoInput,
} from "@/modules/hr/schemas/employee-schema";
import { updateEmployeeHrInfoAction } from "@/modules/hr/actions/employee-actions";
import type { EmployeeRow } from "@/modules/hr/repositories/employee-repository";

export type CurrencyOption = { code: string; label: string };

export function EmployeeHrInfoDialog({
  employee,
  currencies,
}: {
  employee: EmployeeRow;
  currencies: CurrencyOption[];
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const form = useForm<z.input<typeof updateEmployeeHrInfoSchema>, unknown, UpdateEmployeeHrInfoInput>({
    resolver: zodResolver(updateEmployeeHrInfoSchema),
    defaultValues: {
      employeeNumber: employee.employee_number ?? undefined,
      hireDate: employee.hire_date ?? undefined,
      employmentType: (employee.employment_type as UpdateEmployeeHrInfoInput["employmentType"]) ?? undefined,
      baseSalary: employee.base_salary ?? undefined,
      salaryCurrencyCode: employee.salary_currency_code ?? undefined,
      hrStatus: employee.hr_status as UpdateEmployeeHrInfoInput["hrStatus"],
      terminationDate: employee.termination_date ?? undefined,
      notes: employee.notes ?? undefined,
    },
  });

  async function onSubmit(values: UpdateEmployeeHrInfoInput) {
    const result = await updateEmployeeHrInfoAction(employee.id, values);
    if (result.success) {
      toast.success("HR info updated");
      setOpen(false);
      router.refresh();
    } else {
      toast.error(result.error.message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          Edit HR info
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Edit HR info</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="employeeNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Employee #</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="hireDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hire date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="employmentType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Employment type</FormLabel>
                    <Select value={field.value ?? "none"} onValueChange={(v) => field.onChange(v === "none" ? undefined : v)}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Unset" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Unset</SelectItem>
                        {EMPLOYMENT_TYPES.map((t) => (
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
              <FormField
                control={form.control}
                name="hrStatus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>HR status</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {HR_STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s.replace(/_/g, " ")}
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
                name="baseSalary"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Base salary</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} step={0.01} {...field} value={(field.value as number | undefined) ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="salaryCurrencyCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Salary currency</FormLabel>
                    <Select value={field.value ?? "none"} onValueChange={(v) => field.onChange(v === "none" ? undefined : v)}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Unset" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Unset</SelectItem>
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
            </div>
            <FormField
              control={form.control}
              name="terminationDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Termination date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} value={field.value ?? ""} />
                  </FormControl>
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
                {form.formState.isSubmitting ? "Saving..." : "Save changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
