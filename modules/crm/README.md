# CRM Module

Customers, contacts, and quotes — Module 5. Feeds `customer_reference`/future customer FKs on
Planning and any future Rental/Events module.

Database + RLS: `supabase/migrations/0057-0060`. Service layer: `schemas/ -> repositories/ ->
services/ -> actions/`, own copy of `shared/{authorize,audit,run-action}.ts` (same decision made
for Planning — no cross-module refactor).

No separate "leads" table — `customers.lifecycle_stage` (`lead|prospect|active|inactive`) covers
the whole relationship instead of an awkward lead-to-customer conversion migration. Quotes
snapshot `unit_price`/`currency_code` per line at quote time; `equipment_models` has no live
catalog rate. `event_reference` on `quotes` is additive-FK-later, same pattern used throughout
this codebase for not-yet-built modules.

UI: `app/(dashboard)/crm/*`.
