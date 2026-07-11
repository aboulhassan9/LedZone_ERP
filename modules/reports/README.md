# Reports Module

Cross-module reporting and dashboards — Module 12.

Three read-only dashboards (no domain state, no schemas/services/actions, only a single
`reports.view` permission and a `repositories/` layer of pure aggregation queries against other
modules' tables), plus one persisted, mutating report added afterward:

- **Inventory utilization** (`repositories/inventory-report-repository.ts`) — `equipment_items`
  status breakdown, and per-model utilization (`itemsOut / totalItems`, where "out" means
  `picked`/`in_transit`/`on_site`/`in_use`).
- **Financials** (`repositories/financial-report-repository.ts`) — all-time revenue from `paid`
  invoices vs. `approved`/`paid` expenses, grouped by currency. Recomputed live on every page
  load, not stored.
- **Event profitability** (`repositories/event-profitability-report-repository.ts`) — revenue
  minus cost per event, by currency, using `invoices.event_id`/`expenses.event_id`'s direct FKs
  (not `documents`' polymorphic reference).

### Financial history — persisted weekly/monthly snapshots

Unlike the three reports above, `financial_reports` (migrations 0081-0083) is a genuine write —
a report is generated once per `(period_type, period_start, period_end, currency_code)` and
stored, not recomputed live. That matters for a historical record: a past month's report should
still read the way it did back then even if someone later corrects a stray expense entry. This
gave Reports its first `errors.ts`/`shared/`/`schemas/`/`services/`/`actions/` layer, same shape
as every write-capable module in this codebase.

- **Income** = cash actually received — `sum(invoice_payments.amount)` where `paid_at` falls in
  the period (not invoice totals; an invoice issued in one period but paid in the next belongs
  to the period it was actually paid in).
- **Expenses** = `approved`/`paid` expenses whose `expense_date` falls in the period.
- Never summed across currencies — one row per currency actually seen in that period, same
  discipline as the live Financials report above.
- **Generation is idempotent**: regenerating an existing period overwrites it (upsert on the
  unique period+currency key) — useful after correcting a stray entry.

**Two ways a report gets generated:**
1. **Manually** — the "Generate report" dialog on `/reports/financial-history`, gated by
   `finance.manage` (compensation-adjacent data, same sensitivity bar as HR's payroll).
2. **Automatically** — `app/api/cron/financial-reports/{weekly,monthly}/route.ts`, scheduled via
   `vercel.json` (every Monday for the week just finished; the 1st of each month for the month
   just finished). These run under the service-role client
   (`lib/supabase/admin.ts`, `generated_by` left `null`) since a cron invocation has no user
   session for RLS to check — same pattern `lib/services/notification-service.ts` already uses
   for system-triggered writes. **Requires `CRON_SECRET` set in the deployment's environment
   variables** — without it, both routes correctly refuse every request, including Vercel's own.
   This is real, working automation, not a placeholder: once `CRON_SECRET` is set and the app is
   deployed to Vercel, the schedule in `vercel.json` runs on its own.

UI: `app/(dashboard)/reports/*` — the first three reports are plain Server Components (no client
interactivity needed for read-only aggregation); `financial-history/page.tsx` adds the one
client-interactive piece (the generate dialog).
