# Warehouse Module — Known Limitations

Consolidated from `07-testing-report.md`. Ordered roughly by how much it matters for a
production sign-off.

1. **Status-transition validation is incomplete.** Only `pickEquipmentItem` checks the
   item's current status before transitioning. `putAwayEquipmentItem`,
   `quarantineEquipmentItem`, `releaseFromQuarantineEquipmentItem`, `scrapEquipmentItem`,
   and the RPC-driven completion of a dispatch/receiving line have no status guard, at
   either the JS or database layer. See `07-testing-report.md` §1a.

2. **Reservation conflict check has a race window.** "One active reservation per item" is
   enforced by application-level check-then-insert, not a DB constraint. See
   `07-testing-report.md` §1b.

3. **Partial transfer-execution failure doesn't reverse already-completed lines** — it
   marks the transfer `failed` and stops. See `07-testing-report.md` §1c.

4. **No multi-organization/tenant support.** Single-company by design (see
   `01-architecture.md`). Not a gap to fix — a future module if the business ever expands
   to multiple entities.

5. **Audit logs don't capture IP/device**, and the `changes` JSON blob isn't a structured
   old-value/new-value diff — it's whatever each call site chose to record. This is a
   project-wide pattern (Module 1/2 have the same shape), not Warehouse-specific.

6. **Seven permission keys are seeded but unused**: `warehouse.audit`,
   `warehouse.bulk.update`, `warehouse.capacity`, `warehouse.mobile`, `warehouse.print`,
   `warehouse.reports`, `warehouse.settings` — reserved for features not yet built.

7. **No automated test suite.** Zero test infrastructure exists in this repository
   (no Vitest/Jest, no `test` script). See `10-live-testing-checklist.md`.

8. **No camera/QR-decoding library.** Scanning is keyboard-wedge/handheld-scanner based
   only — there's no in-browser camera scanning.

9. **Live performance, security, and cross-device/dark-mode UI testing were not run** in
   this milestone — this session's environment can't reach the live app over the network.
   See `10-live-testing-checklist.md`.

10. **No monitoring/alerting/backup/DR automation** wired into the application. These are
    Supabase-account/dashboard-level settings, not application code, and weren't configured
    as part of this milestone.
