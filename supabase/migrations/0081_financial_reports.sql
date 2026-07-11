-- 0081_financial_reports: persisted weekly/monthly income-vs-expense snapshots. Unlike the
-- existing Reports module (0079), which is pure read-only aggregation with no mutation, this
-- is a genuine write -- a report is generated and stored once per (period_type, period_start,
-- period_end, currency_code), not recomputed live on every page load. That matters for a
-- historical record: December's report should still read the way it did in December even if
-- someone later corrects a stray expense entry.
--
-- "Income" here is cash actually received (sum of invoice_payments.amount within the period),
-- not invoice totals -- an invoice issued in one period but paid in the next belongs to the
-- period it was actually paid in. "Expenses" are approved/paid expenses whose expense_date
-- falls in the period. Never summed across currencies, same discipline as the live Financials
-- report (0079) -- one row per currency actually seen in that period.

create table public.financial_reports (
  id uuid primary key default gen_random_uuid(),
  period_type text not null check (period_type in ('weekly', 'monthly')),
  period_start date not null,
  period_end date not null,
  currency_code text not null references public.currencies (code),
  total_income numeric(14, 2) not null default 0,
  total_expenses numeric(14, 2) not null default 0,
  net_amount numeric(14, 2) not null default 0,
  payment_count integer not null default 0,
  expense_count integer not null default 0,
  generated_at timestamptz not null default now(),
  generated_by uuid references public.profiles (id),
  notes text,
  created_at timestamptz not null default now(),
  constraint financial_reports_period check (period_end >= period_start)
);

comment on table public.financial_reports is
  'A persisted income-vs-expense snapshot for one week or month, one row per currency. generated_by is null for cron-generated reports (system-triggered via the service-role client, no user session to attribute it to).';

create unique index financial_reports_period_currency_idx
  on public.financial_reports (period_type, period_start, period_end, currency_code);
create index financial_reports_period_start_idx on public.financial_reports (period_start desc);
create index financial_reports_generated_by_idx on public.financial_reports (generated_by);

alter table public.financial_reports enable row level security;

create policy "financial_reports_select_viewers"
  on public.financial_reports for select
  to authenticated
  using (public.has_permission((select auth.uid()), 'reports.view'));

-- Manual generation (an authenticated user clicking "Generate report") goes through this
-- policy. Cron-triggered generation uses the service-role client (lib/supabase/admin.ts),
-- which bypasses RLS entirely -- same established pattern as
-- lib/services/notification-service.ts and modules/users/actions/invite-user.ts for
-- system-triggered writes with no user session to check a policy against.
create policy "financial_reports_insert_managers"
  on public.financial_reports for insert
  to authenticated
  with check (public.has_permission((select auth.uid()), 'finance.manage'));
