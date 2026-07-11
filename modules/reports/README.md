# Reports Module

Cross-module reporting and dashboards — Module 12. Read-only: no domain state of its own, no
schemas/services/actions layer, only a single `reports.view` permission (migration 0079) and a
`repositories/` layer of pure aggregation queries against other modules' tables.

Three reports, matching the module's original scope note:

- **Inventory utilization** (`repositories/inventory-report-repository.ts`) — `equipment_items`
  status breakdown, and per-model utilization (`itemsOut / totalItems`, where "out" means
  `picked`/`in_transit`/`on_site`/`in_use`).
- **Financials** (`repositories/financial-report-repository.ts`) — revenue from `paid` invoices
  vs. `approved`/`paid` expenses, grouped by currency. Never summed across currencies — that's
  what `lib/exchange-rate` exists to convert deliberately, not something this report does
  silently.
- **Event profitability** (`repositories/event-profitability-report-repository.ts`) — revenue
  minus cost per event, by currency, using `invoices.event_id`/`expenses.event_id`'s direct FKs
  (not `documents`' polymorphic reference).

UI: `app/(dashboard)/reports/*`, plain Server Components — no client interactivity needed for
read-only aggregation.
