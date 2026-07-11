# Events Module

The client/project record — Module 6. Equipment reservations and crew/vehicle bookings are
deliberately NOT owned here; Module 4 (Planning) already owns that ground via `equipment_plans`,
which links to an event through its own `event_id` FK (same for CRM's `quotes.event_id`).

Database + RLS: `supabase/migrations/0061-0064`. Service layer: `schemas/ -> repositories/ ->
services/ -> actions/`, own copy of `shared/{authorize,audit,run-action}.ts` (same decision made
for Planning and CRM — no cross-module refactor).

`events.status` is a lightweight project pipeline (`planning -> confirmed -> in_progress ->
completed`, cancellable from any non-terminal state), the same proportionate-scope treatment
CRM's `quotes.status` gets — not the two-layer DB+app machine `equipment_items` has, since
nothing physical is being tracked here.

Checklist items and timeline items are simple child records of an event (to-dos and scheduled
day-of beats respectively) — no workflow of their own beyond a done/not-done flag.

UI: `app/(dashboard)/events/*`.
