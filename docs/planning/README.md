# Planning Module — Documentation

## Scope

The Resource Planning & Scheduling Engine (Module 4). Turns event-level equipment demand into
a plan that's checked against real availability, refined through an explicit workflow, and only
touches physical inventory (a real Warehouse reservation, a real equipment lifecycle transition)
once it reaches the Prepared stage. See `modules/planning/README.md` for the file-level summary
and the original architecture proposal (in this session's plan history) for the full design
rationale — this document covers what's operationally relevant.

## Permissions

13 keys, seeded in `0053_planning_permissions.sql`, granted to roles via **Admin → Roles &
Permissions** (not granted to anyone by default).

| Key | Grants |
|---|---|
| `planning.view` | Read access to every planning screen |
| `planning.manage` | Blanket override — every planning action |
| `planning.create` / `update` / `delete` | Plan CRUD |
| `planning.approve` | Ready → Approved |
| `planning.prepare` | Approved → Prepared (creates real reservations + equipment lifecycle transitions) |
| `planning.load` | Prepared → Loaded |
| `planning.complete` | Loaded → Completed |
| `planning.cancel` | Cancel from any pre-Loaded status |
| `planning.assign.crew` / `planning.assign.vehicle` | Manage the crew/vehicle directory and bookings |
| `planning.reports` | Seeded, not yet wired to any feature |

## The equipment lifecycle touchpoints

Two lifecycle edges that were legal in `equipment_status_transitions` (0045) but unreached by
anything before Module 4:

- **Prepare**: `available → reserved`, via `reserveEquipmentItem` (new).
- **Complete**: `in_transit/on_site → returned`, via `returnEquipmentItem` (new).
- **Cancel** (if the plan reached Prepared): `reserved → available`, via
  `releaseReservedEquipmentItem` (new) — but only for items still `reserved`; one that's already
  moved on (a race with Warehouse's own floor operations) is left alone, not forced backward.

**Load is deliberately a gate, not a driver.** `reserved → picked → in_transit` is already owned
by Warehouse's existing pick/dispatch screens (`pickEquipmentItem`, which accepts a `reserved`
source item since it uses the general transition guard, and `complete_warehouse_dispatch_line`,
which sets `in_transit`) — untouched by Module 4. `load_equipment_plan` only checks that every
assigned item has already reached `in_transit` before releasing its reservation.

## Reservation strategy

Draft/Planning/Ready/Approved never create a `warehouse_reservations` row — Approved-stage
demand is a soft hold, counted in the availability math but not physically reserved. Only
**Prepare** calls `reservationService.createReservation` (existing Warehouse service), once per
assigned individually-tracked item — the only call site in the codebase that creates a
reservation on Module 4's behalf. Consumable-model plan items never get an assignment row or a
reservation; their commitment is purely the Approved-stage quantity math.

## Concurrency

Every multi-table workflow write (`prepare_equipment_plan`, `approve_equipment_plan`,
`load_equipment_plan`, `complete_equipment_plan`, `cancel_equipment_plan`,
`replace_equipment_plan_conflicts`) is one `SECURITY DEFINER` Postgres function (0055) — a raised
exception anywhere inside rolls back everything the function already did. Prepare's item
selection is decided in JS (`AvailabilityService.selectEligibleItems`) but the actual reservation
is created inside the atomic function via `create_warehouse_reservation`, whose partial unique
index (0047) is the real concurrency guard against two plans racing for the same item.

## Known limitations

- **No crew/vehicle double-booking detection.** `resource_assignments` is a plain booking record
  — an explicit, already-agreed scope decision (belongs to a future HR/Crew and Fleet module).
- **`maintenance_conflict` detection is not implemented.** It would need a forward-looking
  maintenance schedule; Module 2 only tracks completed maintenance today. Flagged in
  `ConflictDetectionService`'s code comment as an explicit deferral, not an oversight.
- **No drag-and-drop/calendar/timeline view.** Module 4.3 ships list/detail screens only — the
  data model (date-ranged plans and assignments) supports a calendar view without any schema
  change, but the view itself isn't built.
- **`equipment_plans.status` has no DB-level transition-table backstop** (unlike
  `equipment_items.current_status`'s `equipment_status_transitions`). `PlanWorkflowService` is
  the sole enforcement layer for plan-status legality. Flagged twice during design as an
  available, cheap follow-up if the same defense-in-depth treatment is wanted here.
- **No automated test suite**, consistent with the rest of this codebase (no test runner exists
  yet anywhere in the project).
- **No CRM/Events/Rental/Finance/Fleet/HR integration yet.** `customer_reference`/
  `event_reference` are free text (additive-FK-later, same pattern as
  `warehouse_dispatch_records.destination_reference`); `crew_members`/`vehicles` are
  intentionally thin stubs expected to be replaced/absorbed by future modules.
