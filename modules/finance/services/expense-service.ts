import "server-only";
import { assertAnyPermission } from "@/modules/finance/shared/authorize";
import { logFinanceAudit } from "@/modules/finance/shared/audit";
import { ConflictError, NotFoundError, toFinanceError } from "@/modules/finance/errors";
import {
  createExpenseSchema,
  updateExpenseSchema,
  setExpenseStatusSchema,
  listExpensesSchema,
  type CreateExpenseInput,
  type UpdateExpenseInput,
  type SetExpenseStatusInput,
  type ListExpensesInput,
} from "@/modules/finance/schemas/expense-schema";
import { expenseRepository, type ExpenseRow } from "@/modules/finance/repositories/expense-repository";

// An expense's status is a straightforward approval pipeline, not a physical-state machine --
// same proportionate-scope decision made throughout this codebase's other status pipelines.
const TRANSITIONS: Record<string, string[]> = {
  draft: ["approved", "cancelled"],
  approved: ["paid", "cancelled"],
  paid: [],
  cancelled: [],
};

async function requireExpense(id: string): Promise<ExpenseRow> {
  const expense = await expenseRepository.findById(id);
  if (!expense) throw new NotFoundError("Expense");
  return expense;
}

async function createExpense(input: CreateExpenseInput): Promise<ExpenseRow> {
  const userId = await assertAnyPermission(["finance.manage", "finance.expenses.manage"]);
  const parsed = createExpenseSchema.parse(input);

  try {
    const expense = await expenseRepository.create(parsed, userId);
    await logFinanceAudit("expense.created", "expenses", expense.id, {
      category: parsed.category,
      amount: parsed.amount,
    });
    return expense;
  } catch (error) {
    throw toFinanceError(error, "Expense");
  }
}

async function updateExpense(id: string, input: UpdateExpenseInput): Promise<ExpenseRow> {
  const userId = await assertAnyPermission(["finance.manage", "finance.expenses.manage"]);
  const parsed = updateExpenseSchema.parse(input);
  const expense = await requireExpense(id);
  if (expense.status !== "draft") {
    throw new ConflictError(`Expense is "${expense.status}" -- only a draft expense can be edited.`);
  }

  try {
    const updated = await expenseRepository.update(id, parsed, userId);
    await logFinanceAudit("expense.updated", "expenses", id, parsed);
    return updated;
  } catch (error) {
    throw toFinanceError(error, "Expense");
  }
}

async function getExpense(id: string): Promise<ExpenseRow> {
  await assertAnyPermission(["finance.manage", "finance.view"]);
  return requireExpense(id);
}

async function listExpenses(filters: ListExpensesInput): Promise<ExpenseRow[]> {
  await assertAnyPermission(["finance.manage", "finance.view"]);
  const parsed = listExpensesSchema.parse(filters);
  return expenseRepository.list(parsed);
}

async function setExpenseStatus(id: string, input: SetExpenseStatusInput): Promise<ExpenseRow> {
  const userId = await assertAnyPermission(["finance.manage", "finance.expenses.manage"]);
  const parsed = setExpenseStatusSchema.parse(input);
  const expense = await requireExpense(id);

  if (!TRANSITIONS[expense.status]?.includes(parsed.status)) {
    throw new ConflictError(`Cannot move a "${expense.status}" expense to "${parsed.status}".`);
  }

  try {
    const updated = await expenseRepository.setStatus(id, parsed.status, userId);
    await logFinanceAudit(`expense.${parsed.status}`, "expenses", id);
    return updated;
  } catch (error) {
    throw toFinanceError(error, "Expense");
  }
}

async function deleteExpense(id: string): Promise<void> {
  const userId = await assertAnyPermission(["finance.manage", "finance.expenses.manage"]);
  const expense = await requireExpense(id);
  if (expense.status !== "draft") {
    throw new ConflictError(`Expense is "${expense.status}" -- only a draft expense can be deleted.`);
  }

  try {
    await expenseRepository.softDelete(id, userId);
    await logFinanceAudit("expense.deleted", "expenses", id);
  } catch (error) {
    throw toFinanceError(error, "Expense");
  }
}

export const expenseService = {
  createExpense,
  updateExpense,
  getExpense,
  listExpenses,
  setExpenseStatus,
  deleteExpense,
};
