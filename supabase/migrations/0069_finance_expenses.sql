-- 0069_finance_expenses: Module 8 (Finance), expense-tracking half. A single-line company cost
-- record (fuel, repairs, salaries, ...), optionally tied to the event it was incurred for.
-- Deliberately not a double-entry ledger/chart-of-accounts -- that's a materially larger system
-- than this ERP's other modules attempt, and nothing downstream (Reports, Module 12) requires
-- one yet. This is the same proportionate-scope call made for every other module's status
-- pipeline.

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  category text not null check (
    category in ('fuel', 'equipment_repair', 'salaries', 'rent', 'utilities', 'transport', 'supplies', 'other')
  ),
  description text not null,
  amount numeric(14, 2) not null check (amount > 0),
  currency_code text not null references public.currencies (code),
  expense_date date not null default current_date,
  event_id uuid references public.events (id),
  vendor text,
  status text not null default 'draft' check (
    status in ('draft', 'approved', 'paid', 'cancelled')
  ),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id),
  updated_by uuid references public.profiles (id),
  deleted_at timestamptz,
  deleted_by uuid references public.profiles (id)
);

comment on table public.expenses is
  'A single company cost record. Not a double-entry ledger -- category is a flat classification, not a chart of accounts.';

create index expenses_category_idx on public.expenses (category);
create index expenses_status_idx on public.expenses (status);
create index expenses_currency_code_idx on public.expenses (currency_code);
create index expenses_event_id_idx on public.expenses (event_id);
create index expenses_expense_date_idx on public.expenses (expense_date);
create index expenses_created_by_idx on public.expenses (created_by);
create index expenses_updated_by_idx on public.expenses (updated_by);
create index expenses_deleted_by_idx on public.expenses (deleted_by);

create trigger set_expenses_updated_at
  before update on public.expenses
  for each row
  execute function public.set_updated_at();

alter table public.expenses enable row level security;

create policy "expenses_select_viewers"
  on public.expenses for select
  to authenticated
  using (public.has_permission((select auth.uid()), 'finance.view'));

create policy "expenses_insert_managers"
  on public.expenses for insert
  to authenticated
  with check (
    public.has_permission((select auth.uid()), 'finance.manage')
    or public.has_permission((select auth.uid()), 'finance.expenses.manage')
  );

create policy "expenses_update_managers"
  on public.expenses for update
  to authenticated
  using (
    public.has_permission((select auth.uid()), 'finance.manage')
    or public.has_permission((select auth.uid()), 'finance.expenses.manage')
  )
  with check (
    public.has_permission((select auth.uid()), 'finance.manage')
    or public.has_permission((select auth.uid()), 'finance.expenses.manage')
  );
