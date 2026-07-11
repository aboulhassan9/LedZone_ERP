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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import {
  AgreementLineItemsField,
  type ModelOption,
} from "@/modules/rental/components/agreements/agreement-line-items-field";
import { createRentalAgreementSchema, type CreateRentalAgreementInput } from "@/modules/rental/schemas/rental-agreement-schema";
import { createRentalAgreementAction } from "@/modules/rental/actions/rental-agreement-actions";

export type CustomerOption = { id: string; label: string };
export type CurrencyOption = { code: string; label: string };
export type EventOption = { id: string; label: string };

function toDatetimeLocal(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function AgreementCreateDialog({
  customers,
  currencies,
  models,
  events,
  defaultCustomerId,
}: {
  customers: CustomerOption[];
  currencies: CurrencyOption[];
  models: ModelOption[];
  events: EventOption[];
  defaultCustomerId?: string;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const form = useForm<z.input<typeof createRentalAgreementSchema>, unknown, CreateRentalAgreementInput>({
    resolver: zodResolver(createRentalAgreementSchema),
    defaultValues: {
      customerId: defaultCustomerId ?? "",
      currencyCode: currencies[0]?.code ?? "",
      rentalStartAt: toDatetimeLocal(new Date()),
      rentalEndAt: toDatetimeLocal(new Date(Date.now() + 24 * 60 * 60 * 1000)),
      depositAmount: 0,
      lineItems: [{ modelId: "", quantity: 1, dailyRate: 0 }],
    },
  });

  async function onSubmit(values: CreateRentalAgreementInput) {
    const result = await createRentalAgreementAction({
      ...values,
      rentalStartAt: new Date(values.rentalStartAt).toISOString(),
      rentalEndAt: new Date(values.rentalEndAt).toISOString(),
    });
    if (result.success) {
      toast.success("Rental agreement created");
      setOpen(false);
      form.reset();
      router.push(`/rental/${result.data.agreement.id}`);
    } else {
      toast.error(result.error.message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus />
          New agreement
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create a rental agreement</DialogTitle>
          <DialogDescription>
            Physical checkout/check-in happens in Planning + Warehouse — this is the contract.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="customerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select customer" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {customers.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
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
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="rentalStartAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rental start</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="rentalEndAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rental end</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="eventId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Event</FormLabel>
                    <Select
                      value={field.value ?? "none"}
                      onValueChange={(value) => field.onChange(value === "none" ? undefined : value)}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Unset" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Unset</SelectItem>
                        {events.map((e) => (
                          <SelectItem key={e.id} value={e.id}>
                            {e.label}
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
                name="depositAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Deposit</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} step={0.01} {...field} value={field.value as number} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid gap-2">
              <FormLabel>Line items</FormLabel>
              <AgreementLineItemsField models={models} />
            </div>
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
                {form.formState.isSubmitting ? "Creating..." : "Create agreement"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
