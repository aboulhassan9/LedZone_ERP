import { requirePermission, hasPermission } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { ExpenseTable } from "@/modules/finance/components/expenses/expense-table";
import { ExpenseFormDialog } from "@/modules/finance/components/expenses/expense-form-dialog";
import type { ExpenseRow } from "@/modules/finance/repositories/expense-repository";

export default async function ExpensesPage() {
  await requirePermission("finance.view");

  const supabase = await createClient();
  const [{ data: expenses }, { data: currencies }, { data: events }, canCreate] = await Promise.all([
    supabase
      .from("expenses")
      .select("id, category, description, amount, currency_code, expense_date, event_id, vendor, status, notes, created_at, updated_at")
      .is("deleted_at", null)
      .order("expense_date", { ascending: false }),
    supabase.from("currencies").select("code, name").eq("is_active", true).order("code"),
    supabase.from("events").select("id, name").is("deleted_at", null).order("event_start_at", { ascending: false }),
    hasPermission("finance.manage").then((v) => v || hasPermission("finance.expenses.manage")),
  ]);

  const currencyOptions = (currencies ?? []).map((c) => ({ code: c.code, label: `${c.code} — ${c.name}` }));
  const eventOptions = (events ?? []).map((e) => ({ id: e.id, label: e.name }));
  const eventNames = Object.fromEntries(eventOptions.map((e) => [e.id, e.label]));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Expenses</h1>
          <p className="text-muted-foreground text-sm">Company costs — draft → approved → paid.</p>
        </div>
        {canCreate && <ExpenseFormDialog currencies={currencyOptions} events={eventOptions} />}
      </div>
      <ExpenseTable
        expenses={(expenses ?? []) as ExpenseRow[]}
        currencies={currencyOptions}
        events={eventOptions}
        eventNames={eventNames}
      />
    </div>
  );
}
