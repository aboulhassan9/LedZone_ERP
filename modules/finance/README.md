# Finance Module

Invoicing and expenses — Module 8. Multi-currency via `lib/currency`/`lib/exchange-rate`, same
as every other money-handling module in this codebase.

Deliberately not a double-entry ledger/chart-of-accounts system: `expenses.category` is a flat
classification, not a chart of accounts, and there's no journal/GL table. That's a materially
larger system than any other module here attempts, and nothing downstream currently requires
one — the same proportionate-scope call made for every other module's status pipeline.

Database + RLS: `supabase/migrations/0068-0070`. Service layer: `schemas/ -> repositories/ ->
services/ -> actions/`, own copy of `shared/{authorize,audit,run-action}.ts` (same decision made
for Planning, CRM, Events, and Rental — no cross-module refactor).

**Invoices**: `draft -> sent -> paid`, cancellable from draft/sent. "Overdue" is computed in the
UI from `due_date`, never stored. Payments are their own append-only table
(`invoice_payments`) rather than a single `amount_paid` column, so partial payments and the
method/reference of each one are preserved — recording a payment is independent of the invoice's
own status (a partial payment can land while an invoice is still "sent"; marking it "paid" is a
separate, deliberate action). An invoice optionally links to the event and/or rental agreement it
bills for.

**Expenses**: `draft -> approved -> paid`, cancellable from draft/approved. A single-line company
cost record, optionally tied to the event it was incurred for.

UI: `app/(dashboard)/finance/*`.
