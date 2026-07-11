"use server";

import { revalidatePath } from "next/cache";
import { runAction } from "@/modules/finance/shared/run-action";
import type { ActionResult } from "@/modules/warehouse/types/action-result";
import { expenseService } from "@/modules/finance/services/expense-service";
import type {
  CreateExpenseInput,
  UpdateExpenseInput,
  SetExpenseStatusInput,
  ListExpensesInput,
} from "@/modules/finance/schemas/expense-schema";
import type { ExpenseRow } from "@/modules/finance/repositories/expense-repository";

function revalidateExpenses(id?: string) {
  revalidatePath("/finance/expenses");
  if (id) revalidatePath(`/finance/expenses/${id}`);
}

export async function createExpenseAction(input: CreateExpenseInput): Promise<ActionResult<ExpenseRow>> {
  const result = await runAction(() => expenseService.createExpense(input));
  revalidateExpenses();
  return result;
}

export async function updateExpenseAction(
  id: string,
  input: UpdateExpenseInput
): Promise<ActionResult<ExpenseRow>> {
  const result = await runAction(() => expenseService.updateExpense(id, input));
  revalidateExpenses(id);
  return result;
}

export async function getExpenseAction(id: string): Promise<ActionResult<ExpenseRow>> {
  return runAction(() => expenseService.getExpense(id));
}

export async function listExpensesAction(filters: ListExpensesInput): Promise<ActionResult<ExpenseRow[]>> {
  return runAction(() => expenseService.listExpenses(filters));
}

export async function setExpenseStatusAction(
  id: string,
  input: SetExpenseStatusInput
): Promise<ActionResult<ExpenseRow>> {
  const result = await runAction(() => expenseService.setExpenseStatus(id, input));
  revalidateExpenses(id);
  return result;
}

export async function deleteExpenseAction(id: string): Promise<ActionResult<void>> {
  const result = await runAction(() => expenseService.deleteExpense(id));
  revalidateExpenses();
  return result;
}
