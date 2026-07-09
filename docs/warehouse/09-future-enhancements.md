# Warehouse Module — Future Enhancements

Not commitments — a candidate list, roughly grouped.

## Correctness follow-ups (see `08-known-limitations.md`)

- Define the full equipment status transition graph explicitly and enforce it at the RPC
  layer (not just JS), closing the gap in `07-testing-report.md` §1a.
- Add a partial unique index backing "one active reservation per item" and handle the
  resulting conflict as a friendly error, closing §1b.
- Decide and implement the intended behavior for partial transfer-execution failure
  (leave as-is / add compensating rollback), closing §1c.
- Add IP/device capture and a structured old/new-value diff to `audit_logs` if stronger
  forensic logging is wanted (a Module 1-level change, not Warehouse-specific).

## Features hinted at by already-seeded permissions

- Warehouse-scoped audit log viewer (`warehouse.audit`).
- Bulk edit UI for warehouse records (`warehouse.bulk.update`).
- Capacity/utilization reporting dashboard (`warehouse.capacity`, `warehouse.reports`).
- Mobile-truck specific screens: driver assignment, live GPS ping, "current event" once an
  Events module exists (`warehouse.mobile`).
- Packing-list/manifest/delivery-note document printing, distinct from location labels
  (`warehouse.print`).
- A dedicated warehouse settings screen (`warehouse.settings`).

## Scanning

- Camera-based QR/barcode scanning (a browser QR-decoding library) as an alternative to
  handheld scanners, for mobile users without hardware.
- Scheduled/lazy cleanup of expired reservations (currently evaluated at read time only, no
  cron).

## Integration with future modules

- Vendor/Customer equipment placement (Rentals module) — today, `warehouse_dispatch_
  records.destination_reference` is free text; a real Rentals module would add a proper FK.
- Truck offline sync (client/PWA concern) once mobile-truck workflows are built out.
- Multi-organization/tenant support, if the business ever needs it (currently explicitly
  out of scope — see `01-architecture.md`).

## Testing infrastructure

- Stand up Vitest (or similar) and build unit/repository/service/action test coverage for
  all 9 warehouse services plus the EquipmentLifecycleService integration points — see
  `10-live-testing-checklist.md`.
- Once a test runner exists, add regression tests for each item in
  `08-known-limitations.md` so a future fix can be verified against a concrete case.
