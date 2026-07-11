# Rental Module

The commercial rental contract — Module 7. Pricing, deposit, and the agreement's own
draft/active/completed/cancelled status.

This module deliberately does NOT re-track individual `equipment_items` or their physical
checkout/check-in: Module 4 (Planning) + Module 3 (Warehouse) already own that ground end-to-end
(`prepare_equipment_plan`/`load_equipment_plan`/`complete_equipment_plan` drive
`reserved -> picked -> in_transit -> returned` through their existing, reviewed pipeline). An
agreement is the paperwork layer above that operational flow — it optionally links to the event
it serves and the quote it was accepted from.

Database + RLS: `supabase/migrations/0066-0067`. Service layer: `schemas/ -> repositories/ ->
services/ -> actions/`, own copy of `shared/{authorize,audit,run-action}.ts` (same decision made
for Planning, CRM, and Events — no cross-module refactor).

`rental_agreements.status` is a lightweight contract pipeline (`draft -> active -> completed`,
cancellable from draft/active), the same proportionate-scope treatment `quotes.status` and
`events.status` get. `deposit_status` (`held -> refunded|forfeited`) can only be settled once the
agreement itself is `completed` or `cancelled`.

Line items snapshot a `daily_rate` per model at signing time, same pattern as
`quote_line_items.unit_price` — pricing is multiplied by the rental window's day count in the UI,
not stored as a precomputed total.

UI: `app/(dashboard)/rental/*`.
