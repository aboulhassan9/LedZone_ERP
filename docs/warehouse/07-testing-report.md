# Warehouse Module — Module 3.5 Testing & Production Readiness Report

Scope and method: this report covers what was verifiable by static code audit and direct
database inspection (via the Supabase MCP connection, which is not subject to this session's
network egress restrictions) within this session. Live-app testing (performance at scale,
active security testing, cross-device/dark-mode UI review) and an automated test suite were
explicitly out of scope for this pass, by the user's own decision — see
`08-known-limitations.md` and `10-live-testing-checklist.md`.

Legend: ✅ verified/passing · 🔧 gap found and fixed in this pass · ⚠️ gap found, not fixed
(needs a decision) · 📝 documented, not a defect

---

## §1 — End-to-end workflow trace

Traced against actual code (repository → service → RPC), not executed live:

| Scenario | Path | Status |
|---|---|---|
| Receiving purchase orders | `createReceivingAction` → `receivingService.createReceiving` (validates `purchaseId` required for `purchase_order` source) → `completeReceivingLineAction` → `complete_warehouse_receiving_line` | ✅ |
| Put-away into locations | `equipmentItemService.putAwayEquipmentItem` → `record_warehouse_item_movement` | ✅ (no status guard — see §1a) |
| QR/barcode scanning | `scanService.resolveScan` → location-code lookup, then asset-tag lookup | ✅, now audited (🔧 below) |
| Internal transfers | `createTransferRequestAction` → `submitTransfer` → `approveTransfer` → `executeTransfer` → `complete_warehouse_transfer_line` per line | ✅ |
| Picking for events | `createPickListAction` (auto-reserves item lines) → `startPickListAction` → `completePickLineAction` | ✅ |
| Dispatch to projects/rentals | `createDispatchAction` (checks availability at creation) → `completeDispatchLineAction` → `complete_warehouse_dispatch_line` | ✅ (no re-check at completion — see §1a) |
| Return receiving | Same path as receiving, `sourceType = 'customer_return'` | ✅ |
| Cycle counts | `createCycleCountAction` → `startCycleCountAction` → `recordCountAction` (×N) → `submitForApprovalAction` → `approveCycleCountAction` | ✅ |
| Inventory reconciliation | Cycle count's `variance` (DB-generated column) + `approveCycleCount`'s consumable-adjustment/lost-report application | ✅ |
| Damage/lost handling | `receivingService.recordLineDamage` / `cycleCountService.approveCycleCount` → Inventory's `incidentService.createDamageReport` / `createLostReport` | ✅ |
| Reservation conflicts | `reservationService.createReservation` — item: rejects if an active reservation exists; location: `assertCapacity` | ✅ (app-level only — see §1b) |
| Equipment lifecycle transitions | See §2 | ⚠️ |

### §1a — Gap: status transitions not re-validated at every write (not fixed)

Only `pickEquipmentItem` checks the item's `current_status` before transitioning
(`available`/`reserved` required). **`putAwayEquipmentItem`, `quarantineEquipmentItem`,
`releaseFromQuarantineEquipmentItem`, `scrapEquipmentItem` have no status guard**, at
either the JS service layer or the `record_warehouse_item_movement` RPC (which only
validates that `movement_type` is one of the five allowed strings — it has no awareness of
`current_status` legality). Concretely: a `retired` item can be quarantined, a `reserved`
item can be scrapped, `releaseFromQuarantine` can be called on an item that was never
quarantined.

Similarly, `complete_warehouse_dispatch_line` unconditionally sets `current_status =
'in_use'` and `complete_warehouse_receiving_line` unconditionally sets `current_status =
'available'`, with no re-check at the moment of completion — `dispatch-service.ts`'s
`createDispatch` only validates availability once, at **creation** time
(`AVAILABLE_FOR_DISPATCH = new Set(["available", "reserved"])`), not at **completion**
time, which can happen arbitrarily later. An item that changed status in the interim
(e.g. got scrapped by another workflow) would still be silently marked `in_use`.

**This was not fixed in this pass** — it's a business-rule decision (what the full legal
transition graph should be, e.g. can a `damaged` item be dispatched?) that needs your input,
not something to guess at. Recommend: define the transition table explicitly, then add the
guard at the RPC layer (not just JS) since these functions are `grant execute ... to
authenticated`, callable directly via Supabase's REST API, bypassing the Next.js app
entirely — the JS-layer check alone is not a real security boundary here.

### §1b — Gap: reservation conflict check has a race window (not fixed)

`createReservation`'s "does this item already have an active reservation" check
(`findActiveForItem` then reject if non-empty) is a check-then-insert in application code,
not a database constraint. No unique index enforces "at most one active reservation per
item" — `warehouse_reservations` only has a CHECK for the location-XOR-item shape. Two
concurrent reservation requests for the same item could both pass the check before either
INSERT commits. Low probability under this app's expected concurrency, but real. Fixing it
requires a partial unique index (`(item_id) where released_at is null`) plus handling the
resulting unique-violation as a friendly `ConflictError` in the service — not done in this
pass since it touches schema.

### §1c — Partial-failure "rollback" doesn't reverse completed work (documented, not a bug)

`executeTransfer`, on a mid-execution failure, marks the transfer `failed` and stops — it
does **not** undo lines already completed before the failure (each `complete_warehouse_
transfer_line` call already committed as its own atomic RPC transaction). This is a
reasonable real-world choice (the system shouldn't unilaterally "un-move" boxes that
already physically moved) but doesn't literally satisfy "rollbacks restore previous state"
if that's read as full compensating rollback. Flagging for your explicit sign-off on which
behavior is actually wanted.

---

## §2 — EquipmentLifecycleService validation

- ✅ **No direct writes to `equipment_items` from the Warehouse module.** Grepped every
  `.from("equipment_items")` call site in `modules/warehouse`; the only hit
  (`warehouse-location-repository.ts`'s `findContents`) is a `.select()`, read-only.
- ✅ **Movement history is created on every write path** — all 7 transactional RPCs (0040)
  and the JS-side `equipmentItemRepository` methods insert into `equipment_item_movements`
  before/with the status update.
- ✅ **Permission checks are present on every RPC** — each of the 7 functions in `0040`
  has an explicit `has_permission()` check matching the JS service's permission set,
  independent of RLS (necessary since they're `SECURITY DEFINER`).
- ⚠️ **Invalid transitions are not fully blocked** — see §1a.
- ⚠️ **Rollback doesn't restore previous state on partial failure** — see §1c.

## §3 — Permission testing

- ✅ RLS is enabled on all 18 Warehouse tables (`rls_enabled = true`, verified via
  `pg_class`/`pg_policy`), each with exactly 3 policies (select/insert/update), no
  policy found with a missing or `true` `USING`/`WITH CHECK` expression.
- ✅ Spot-checked `warehouse_transfers`, `warehouse_reservations`, `warehouse_documents`
  RLS policies against their service-layer `assertPermission`/`assertAnyPermission` calls —
  consistent, no mismatch.
- ✅ Reporting views (`warehouse_capacity_summary`, `warehouse_location_occupancy`) are
  `security_invoker = true` — no RLS bypass through the view layer.
- ✅ List/create-dialog visibility is computed server-side (`hasPermission()` in the page,
  passed down as a boolean prop) rather than trusted to a client-side check — not
  client-spoofable.
- 🔧 **Fixed**: the label print pages (`app/(print)/warehouse/locations/**`) gated their
  Print button on `warehouse.view` only, when the permission seeded specifically for this
  (`warehouse.labels`, "Print location QR/barcode labels") existed unused. Changed the Print
  button to require `warehouse.manage` or `warehouse.labels`.
- 📝 **7 of 24 seeded permission keys have no feature yet**: `warehouse.audit`,
  `warehouse.bulk.update`, `warehouse.capacity`, `warehouse.mobile`, `warehouse.print`,
  `warehouse.reports`, `warehouse.settings`. Not a bug — reserved ahead of features not yet
  built (warehouse-scoped audit log, bulk edit, capacity reporting, mobile-truck, document
  printing, reporting, settings screens). Documented in `05-admin-guide.md` so admins don't
  expect them to do anything yet.
- 📝 **Named roles from the request spec** ("Warehouse Viewer/Operator/Manager, Inventory
  Manager, Administrator") don't exist as seeded roles — the actual system roles are
  **Super Admin / Admin / Manager / Employee** (permission-key-driven, assignable via the
  Roles admin UI). No code change needed; create named roles there if that vocabulary
  matters to the business.

## §4 — Audit log validation

- ✅ Every mutating function in every Warehouse service calls `logWarehouseAudit` — cross-
  referenced all `async function` exports against every `logWarehouseAudit(...)` call site;
  no missed mutation (including `warehouse_document.archived`, which a shallow first grep
  seemed to miss but is present).
- 🔧 **Fixed**: `scanService.resolveScan()` had **zero** audit logging — despite "QR scans,
  Barcode scans" being explicitly named as a required audit category. Added
  `logWarehouseAudit` for all three outcomes (`warehouse_location.scanned`,
  `equipment_item.scanned`, `warehouse_scan.not_found` — including failed/unresolved scans,
  since a scanner reading garbage or a spoofed code is itself security-relevant).
- ⚠️ **`audit_logs` does not capture IP/device.** The table (`0008_audit_logs.sql`) has
  `actor_id, action, entity_type, entity_id, changes, created_at` — no
  `ip_address`/`user_agent` column, and `log_audit_event()` doesn't accept or record
  either. Adding this requires a schema change (new nullable columns) and plumbing request
  headers through every Server Action call site — out of scope for this pass, flagged as a
  known limitation.
- ⚠️ **`changes` is not a structured old-value/new-value diff** — it's a free-form JSON
  blob, and each call site decides what to put in it (some pass rich context, e.g.
  `approveCycleCount` passes `lineCount`; others pass nothing at all, e.g.
  `warehouse_transfer.approved`). "Old values / new values" as literally specified isn't
  implemented anywhere in this codebase (Module 1 or Module 2 either) — this is a
  pre-existing, project-wide pattern, not something introduced by Warehouse.

## §5 — Multi-organization isolation

**Out of scope by design, confirmed with you during this milestone.** There is no
`organization_id`/tenant column anywhere in this schema (`grep -rl "organization_id"` across
migrations/Prisma/modules returns nothing). This is the single-tenant architecture decided
in the original Module 3 design doc, reaffirmed here rather than re-litigated. Logged as a
deferred future-module concern in `08-known-limitations.md` in case multi-entity support is
ever needed.

## §6 — Multi-currency verification

- ✅ `equipment_purchases.currency_code` (FK `currencies`) + `exchange_rate_id` (FK
  `exchange_rates`, snapshotted at purchase time) already give warehouse receiving
  (`sourceType = 'purchase_order'`, linked via `warehouse_receiving_records.purchase_id`)
  full currency/valuation context without duplicating it in the Warehouse schema.
- ✅ `exchange_rates` supports USD/CDF (seeded currencies) and any future pair; rates are
  immutable once recorded (a correction soft-deletes and re-inserts, per the table's own
  comment), so historical accounting isn't retroactively altered by a later rate change.
- 📝 Dispatch and transfer carry no currency/cost fields — by design, since they move
  already-valued stock rather than creating new cost basis. Non-PO receiving paths
  (supplier/customer_return/repair/internal_transfer/manual) also carry no cost/currency —
  valuation for those flows through the item's already-recorded purchase cost, not the
  receiving event itself.

## §7-9 — Performance / Security / UI-device testing

**Not run in this pass** — needs a running app reachable over the network, which this
session's environment blocks (confirmed via a direct proxy test returning 403 for the
Supabase project host). You've indicated you'll handle these separately. See
`10-live-testing-checklist.md` for exactly what to run.

## §10 — Automated testing

**Not implemented in this pass**, per your decision to defer it. Zero test infrastructure
currently exists (no Vitest/Jest, no `test` script in `package.json`). See
`08-known-limitations.md`.

## §11 — Production hardening

- ✅ **DB indexing**: ran the Supabase performance advisor against all Warehouse tables.
  Every finding was `unused_index` at `INFO` level (expected — this is a zero-row dev
  database, so no index has been exercised yet; not evidence of a missing or wrong index).
  Zero `WARN`-level findings for any Warehouse table. Two `unindexed_foreign_keys` findings
  exist project-wide, both on Inventory's `equipment_asset_tag_formats` (pre-existing,
  unrelated to Warehouse).
- 📝 **Monitoring/alerting/backups/DR**: mostly Supabase-account/dashboard-level settings
  (backup schedule, alerting integrations) rather than application code — no
  monitoring/alerting integration (e.g. Sentry) exists anywhere in this codebase to extend.
  Out of scope for a code-level audit; see `10-live-testing-checklist.md`.

## §12 — Documentation

This document set (`docs/warehouse/01`–`10`) — produced as part of this milestone.

---

## Approval gate — status against the original criteria

| Criterion | Status |
|---|---|
| All tests pass | Automated tests not built this pass (deferred by your decision); code audits above all pass except the flagged items |
| No direct equipment status updates bypass EquipmentLifecycleService | ✅ verified — see §2 |
| Permissions and RLS are verified | ✅ verified, one gap found and fixed — see §3 |
| Audit logging is complete | One gap found and fixed (scanning); two gaps documented, not fixed (IP/device, structured diffs) — see §4 |
| UI has been visually approved | Approved in principle from the earlier code-level review; live visual review not completed (network-blocked) |
| Performance targets are met | Not tested at scale this pass — see §7-9 |
| Documentation is complete | ✅ this set |

**Recommendation**: the two unresolved ⚠️ items in §1a/§1b (status-transition validation,
reservation race) are the ones I'd treat as blocking for a genuine "production-ready" sign-off
— everything else found was either fixed inline or is a legitimate, documented deferral.
