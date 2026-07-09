# Warehouse Module — Handoff Checklist for Live Testing

These items need a running app reachable over the network, and/or real test data at
scale — neither is available in this session's environment. Concrete checklist for
whoever runs this next.

## Performance testing (§7)

- [ ] Seed (or use a copy of) 100k+ `equipment_items` rows and confirm list/search pages
      (`/inventory/items`, warehouse pick/transfer line pickers) stay responsive —
      watch for any query missing a `LIMIT`/pagination.
- [ ] Seed 1M+ `equipment_item_movements`/`equipment_item_scans` rows and check the item
      detail page's Activity tab and any movement-history query for slow full-table scans.
- [ ] Build a deep location hierarchy (5+ levels, hundreds of bins per warehouse) and
      confirm the Location Explorer tree renders and searches quickly — it currently
      builds the whole tree client-side from a flat fetch (`buildTree()` in
      `location-tree.tsx`); at very large bin counts this may need pagination or
      virtualization.
- [ ] Fire concurrent transfer/receiving/dispatch line completions against the same
      warehouse and confirm no deadlocks or lost updates (the transactional RPCs are
      single-row-at-a-time; concurrent calls against *different* lines should be fine,
      but verify).
- [ ] Bulk receiving/dispatching of large line counts (100+ lines in one record) — check
      `createWithLines`'s single multi-row insert performs acceptably.
- [ ] Confirm every list page's `DataTable` paginates correctly once row counts are large
      (client-side table component — verify it isn't fetching unbounded result sets from
      Supabase first).
- [ ] Measure search latency on the Location Explorer's code/name filter and the item
      asset-tag lookups behind scanning, at realistic data volumes.

## Security testing (§8)

- [ ] SQL injection — low a priori risk (all queries go through the Supabase JS client's
      parameterized `.eq()`/`.select()` builders or RPC calls with typed parameters, no
      raw string-concatenated SQL found in this codebase), but worth an active pass,
      especially on any free-text field (`reference_note`, `notes`, search inputs).
- [ ] XSS — React escapes by default; audit for any `dangerouslySetInnerHTML` (none found
      in `modules/warehouse` at time of writing) and confirm uploaded document
      filenames/descriptions render safely.
- [ ] CSRF — Next.js Server Actions have built-in CSRF protection (origin-checked); confirm
      this is actually enabled/not bypassed in the deployed configuration.
- [ ] Broken authorization — try calling every warehouse Server Action and every
      transactional RPC directly (bypassing the UI) as a user with insufficient
      permissions; confirm each rejects. Also try RPCs via the Supabase REST API directly
      (`/rest/v1/rpc/...`) as a signed-in but under-permissioned user — several are `grant
      execute to authenticated`, relying on their internal `has_permission()` check as the
      only gate (see `07-testing-report.md` §2).
- [ ] File upload abuse — confirm the 25MB limit in `warehouse-document-service.ts` is
      actually enforced server-side (not just client-side), and test uploading disguised
      executable/script files as a "document."
- [ ] Oversized payloads — test very large `changes` blobs, very long `reference_note`/
      `notes` strings, and large `itemIds` arrays on bulk move.
- [ ] Invalid QR payloads / barcode spoofing — feed `resolveScanAction` malformed strings,
      SQL-metacharacter-laden strings, extremely long strings, and asset tags/full_codes
      belonging to soft-deleted records; confirm graceful `not_found` handling (this is
      now audited per `07-testing-report.md` §4, so failed attempts are at least logged).

## UI/UX testing (§9)

Original ask, unchanged — desktop/tablet/mobile, dark mode, accessibility, keyboard
navigation, loading/empty/error states, responsive layouts, across: Dashboard, Warehouse
list/detail, Location Explorer, Transfer list/detail, Receiving/Dispatch detail, Picking,
Reservations, Cycle Count, Documents. See the earlier screenshot-review request in this
conversation for the full original 14-point list if useful as a starting checklist.

## Automated testing (§10)

- [ ] Choose and install a test runner (Vitest recommended — fastest setup with this
      Next.js/TypeScript stack, no Jest config translation needed).
- [ ] Unit/service tests for: WarehouseService, WarehouseTransferService,
      ReceivingService, DispatchService, PickingService, ReservationService,
      CycleCountService, WarehouseDocumentService, WarehouseLocationCodeService, ScanService.
- [ ] Integration tests for the EquipmentLifecycleService boundary specifically — assert
      that every warehouse operation which should change `equipment_items` actually does,
      and that nothing bypasses it (this report's §2 audit was static; a test suite would
      make it a running regression guard).
- [ ] Regression tests for each item in `08-known-limitations.md`, so a future fix has a
      concrete test to turn green.

## Production hardening (§11 remainder)

- [ ] Confirm Supabase project backup schedule/retention matches your recovery-point
      objective (Supabase dashboard → Database → Backups).
- [ ] Decide on and wire up an error-monitoring/alerting integration (e.g. Sentry) — none
      exists in this codebase today.
- [ ] Document and rehearse a disaster-recovery restore at least once.
