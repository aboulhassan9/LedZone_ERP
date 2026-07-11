import { z } from "zod";

export const PAYROLL_STATUSES = ["draft", "approved", "paid"] as const;

export const createPayrollRecordSchema = z
  .object({
    payPeriodStart: z.string().min(1, "Period start is required"),
    payPeriodEnd: z.string().min(1, "Period end is required"),
    grossAmount: z.coerce.number().min(0, "Gross amount can't be negative"),
    deductions: z.coerce.number().min(0, "Deductions can't be negative").default(0),
    currencyCode: z.string().min(1, "Select a currency"),
    notes: z.string().max(1000).optional(),
  })
  .refine((v) => new Date(v.payPeriodEnd) >= new Date(v.payPeriodStart), {
    message: "Period end must be on or after the period start",
    path: ["payPeriodEnd"],
  })
  .refine((v) => v.deductions <= v.grossAmount, {
    message: "Deductions can't exceed the gross amount",
    path: ["deductions"],
  });
export type CreatePayrollRecordInput = z.infer<typeof createPayrollRecordSchema>;

export const setPayrollRecordStatusSchema = z.object({
  status: z.enum(PAYROLL_STATUSES),
});
export type SetPayrollRecordStatusInput = z.infer<typeof setPayrollRecordStatusSchema>;
