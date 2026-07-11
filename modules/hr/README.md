# HR Module

Employee records, leave, payroll, and performance — Module 10.

Absorbs the `crew_members` table Planning's 0050 migration deliberately left minimal ("Expected
to be replaced/absorbed by a future HR/Crew module") via additive columns only (migration 0074):
`employee_number`/`hire_date`/`employment_type`/`base_salary`/`salary_currency_code`/`hr_status`/
`termination_date`/`notes`. Planning's original identity fields
(`full_name`/`role`/`phone`/`email`/`is_active`) and its own `crew-form-dialog` UI are untouched
— that stays how someone enters the directory for booking purposes. `hr_status` is intentionally
a separate column from `is_active`, same reasoning as Fleet's `fleet_status`: `is_active` is
Planning's simple "bookable at all" toggle, this module owns the employee's own HR lifecycle.

New tables (migration 0075): `leave_requests` (`pending -> approved/rejected`, cancellable while
pending), `payroll_records` (`draft -> approved -> paid`, one row per pay period), and
`performance_reviews` (append-only, same pattern as `vehicle_maintenance_records` without an
update path — a review is a point-in-time record). None existed before —
`resource_assignments` only ever recorded booking windows, never HR events.

Payroll is gated by its own, narrower permission (`hr.payroll.manage`) since compensation data
is more sensitive than leave/performance records — same granular-sub-permission pattern CRM used
for `crm.quotes.manage`.

Database + RLS: `supabase/migrations/0074-0076`. Service layer: `schemas/ -> repositories/ ->
services/ -> actions/`, own copy of `shared/{authorize,audit,run-action}.ts` (same decision made
throughout this codebase — no cross-module refactor). HR's `employeeRepository` only ever writes
its own additive columns.

UI: `app/(dashboard)/hr/*`.
