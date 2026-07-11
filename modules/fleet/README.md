# Fleet Module

Vehicle condition, maintenance history, and fuel/mileage logs — Module 9.

Absorbs the `vehicles` table Planning's 0050 migration deliberately left minimal ("Expected to
be replaced/absorbed by a future Fleet module") via additive columns only (migration 0071):
`make`/`model`/`year`/`vin`/`fuel_type`/`odometer_km`/`fleet_status`/`insurance_expiry_date`/
`registration_expiry_date`. Planning's original identity fields
(`name`/`plate_number`/`vehicle_type`/`capacity_notes`/`is_active`) and its own
`vehicle-form-dialog` UI are untouched — that stays how a vehicle enters the directory for
booking purposes. `fleet_status` (`active`/`maintenance`/`retired`) is intentionally a separate
column from `is_active`: the latter is Planning's simple "bookable at all" toggle, this module
owns the vehicle's actual operational lifecycle.

New tables (migration 0072): `vehicle_maintenance_records` (service/repair history) and
`vehicle_fuel_logs` (an append-only log, same pattern as `invoice_payments`). Neither existed
before — `resource_assignments` only ever recorded booking windows, never vehicle condition or
running costs.

Database + RLS: `supabase/migrations/0071-0073`. Service layer: `schemas/ -> repositories/ ->
services/ -> actions/`, own copy of `shared/{authorize,audit,run-action}.ts` (same decision made
throughout this codebase — no cross-module refactor). Fleet's `vehicleRepository` only ever
writes its own additive columns — it never touches Planning's identity fields.

UI: `app/(dashboard)/fleet/*`.
