# Warehouse Module — Administrator Guide

## Permissions

24 keys, seeded in `0039_warehouse_permissions.sql`, granted to roles via **Admin → Roles &
Permissions** (not granted to anyone by default — you must assign them).

| Key | Grants |
|---|---|
| `warehouse.view` | Read access to every warehouse screen (the baseline — every other key assumes this) |
| `warehouse.manage` | Blanket override — every warehouse action, everywhere |
| `warehouse.create` / `update` / `delete` | Warehouse CRUD |
| `warehouse.location.manage` | Location hierarchy CRUD, quarantine/release |
| `warehouse.bin.manage` | (reserved — same effect as `location.manage` today) |
| `warehouse.transfer` | Create/submit/cancel/execute transfers |
| `warehouse.approve` | Approve/reject transfers, approve cycle counts |
| `warehouse.receive` | Receiving workflow |
| `warehouse.dispatch` | Dispatch workflow |
| `warehouse.pick` | Picking workflow |
| `warehouse.count` | Cycle count workflow (not the approval step — that's `warehouse.approve`) |
| `warehouse.qr.generate` | Generate/regenerate a location's QR/barcode |
| `warehouse.qr.scan` | Use the Scan screen (also implied by `warehouse.view`) |
| `warehouse.labels` | Print a location label (fixed to actually gate this in Module 3.5 — see `07-testing-report.md` §2) |
| `warehouse.bulk.move` | Bulk Move screen |
| `warehouse.audit` / `warehouse.bulk.update` / `warehouse.capacity` / `warehouse.mobile` / `warehouse.print` / `warehouse.reports` / `warehouse.settings` | **Seeded, not yet wired to any feature** — reserved for warehouse-scoped audit log, bulk edit, capacity reporting, mobile-truck, document printing, reporting, and settings screens respectively. Granting them today has no effect. |

There is no "Warehouse Viewer / Operator / Manager" role bundle out of the box — the
seeded system roles are **Super Admin** (all permissions), **Admin**, **Manager**,
**Employee** (see `prisma/seed.ts`). Create named roles with whatever permission bundle
your organization wants via **Admin → Roles & Permissions**.

## Documents

Uploaded to the private `warehouse-docs` Storage bucket; access is via short-lived (5
minute) signed URLs generated server-side, never a public bucket URL. Document types:
photo, inspection_form, damage_report, transfer_document, packing_list, delivery_note,
signature, other.

## Multi-currency

Nothing to configure in the Warehouse module itself. Currencies and exchange rates are
managed under **Admin → Company Settings** (Module 1); a purchase's `exchange_rate_id`
snapshots the rate at purchase time and never changes retroactively.

## Auditing

Every warehouse mutation writes to `audit_logs` via `log_audit_event()` (actor, action,
entity type/id, a free-form `changes` JSON blob, timestamp). There is currently no
IP/device capture and `changes` isn't a structured before/after diff — see
`07-testing-report.md` §3 for the full gap analysis if you need stronger forensic logging.

## Known operational gaps to be aware of

See `07-testing-report.md` and `08-known-limitations.md` for the full list. The two
previously most operationally relevant items — status transitions not being re-validated
at write time, and a reservation race window — are fixed (an explicit state machine and a
database-level unique constraint respectively; see `07-testing-report.md`'s addendum).
Remaining open items are lower-impact: no IP/device audit capture, seven not-yet-wired
permission keys, no automated test suite, and no camera-based scanning — see
`08-known-limitations.md` for the complete list.
