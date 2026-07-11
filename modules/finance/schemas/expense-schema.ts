import { z } from "zod";

export const EXPENSE_CATEGORIES = [
  "fuel",
  "equipment_repair",
  "salaries",
  "rent",
  "utilities",
  "transport",
  "supplies",
  "other",
] as const;
export const EXPENSE_STATUSES = ["draft", "approved", "paid", "cancelled"] as const;

export const createExpenseSchema = z.object({
  category: z.enum(EXPENSE_CATEGORIES),
  description: z.string().min(1, "Description is required").max(500),
  amount: z.coerce.number().positive("Amount must be greater than zero"),
  currencyCode: z.string().min(1, "Select a currency"),
  expenseDate: z.string().min(1, "Date is required"),
  eventId: z.string().uuid().optional(),
  vendor: z.string().max(300).optional(),
  notes: z.string().max(2000).optional(),
});
export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;

export const updateExpenseSchema = z.object({
  category: z.enum(EXPENSE_CATEGORIES).optional(),
  description: z.string().min(1).max(500).optional(),
  amount: z.coerce.number().positive().optional(),
  expenseDate: z.string().min(1).optional(),
  eventId: z.string().uuid().optional(),
  vendor: z.string().max(300).optional(),
  notes: z.string().max(2000).optional(),
});
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;

export const setExpenseStatusSchema = z.object({
  status: z.enum(EXPENSE_STATUSES),
});
export type SetExpenseStatusInput = z.infer<typeof setExpenseStatusSchema>;

export const listExpensesSchema = z.object({
  status: z.enum(EXPENSE_STATUSES).optional(),
  category: z.enum(EXPENSE_CATEGORIES).optional(),
});
export type ListExpensesInput = z.infer<typeof listExpensesSchema>;
