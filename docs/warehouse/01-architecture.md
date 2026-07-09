# Warehouse Module — Technical Architecture

## Scope

Multi-warehouse layout (Zone → Row → Rack → Shelf → Bin, plus staging/loading/repair/
quarantine/dock/charging areas), transfers, receiving, dispatch, picking, cycle counts,
reservations, documents, and QR/barcode operations — built on top of the Inventory
Foundation's `equipment_items` / `consumable_stock_levels`.

## Layering

```
schemas/       Zod schemas — doubles as DTO + validator
repositories/  pure data access, no permission/audit logic
services/      validation + permission + business rules + audit, calls repositories
actions/       thin "use server" wrappers: runAction(() => service.method()) + revalidatePath
components/    React (shadcn/ui + React Hook Form + Zod + React Query)
shared/        authorize.ts, audit.ts, run-action.ts
errors.ts      WarehouseError hierarchy
types/         ActionResult<T>
```

Pages live under `app/(dashboard)/warehouse/*` (dashboard chrome) and
`app/(print)/warehouse/*` (a second route group with no sidebar/topbar, for printable
label pages — same URL space, different layout, resolved by Next.js's route groups).

## The EquipmentLifecycleService boundary

`modules/inventory/services/equipment-item-service.ts` is the only service allowed to
change `equipment_items.current_status` / `current_storage_location_id`. WarehouseService
and its siblings (WarehouseTransferService, ReceivingService, DispatchService,
PickingService, ReservationService, CycleCountService) never write to `equipment_items`
directly. Two sanctioned paths exist:

1. **Simple item-centric moves** (put_away, pick, quarantine, release, scrap, bulk_move) —
   routed through `equipmentItemService` methods added in Module 3.2, which call
   `equipmentItemRepository.recordWarehouseMovementViaTransaction` /
   `recordBulkMoveViaTransaction`.
2. **Compound line-completion operations** (completing a transfer/receiving/dispatch line,
   applying a cycle-count adjustment) — these touch multiple tables atomically (the line,
   the header, the item/consumable, the movement ledger) and are implemented as
   `SECURITY DEFINER` Postgres functions (0040) called directly from the Warehouse
   repositories. This is a deliberate, documented exception to "always go through the JS
   service" — the atomicity boundary is the Postgres function itself, not a JS
   transaction, and every function still enforces the same permission model
   (`has_permission()` check inside the function body) as the JS layer.

See `warehouse-transfer-service.ts`'s `executeTransfer` for the fullest inline explanation
of this boundary, and `03-services-api.md` / `07-testing-report.md` for its audit status.

## Warehouse hierarchy

`warehouse_locations` self-references via `parent_id`, scoped to one `warehouse_id`.
`node_type`: `zone | row | rack | shelf | bin | staging_area | loading_zone | repair_zone |
quarantine_area | dock | charging_station`. Only the second group (bin and the "special
areas") is `is_placeable` — Zone/Row/Rack/Shelf are containers, never a destination. A
trigger maintains `full_code` (ancestor-joined, e.g. `A-03-R12-S2-B04`) and validates
`parent_id` stays within the same warehouse with no cycles.

## The storage_locations bridge

Module 2's flat `storage_locations` table (what `equipment_items.current_storage_location_id`
actually points to) is bridged to Module 3's rich hierarchy via one nullable column:
`storage_locations.warehouse_location_id`. `resolve_storage_location_for_warehouse_location()`
(0040) resolves a `warehouse_locations` node to its bridged `storage_locations` row, raising
if unbridged. `WarehouseLocationService.ensureStorageLocationBridge()` auto-provisions the
bridge row the first time an item is placed at a bin that doesn't have one yet.

## Consumable vs. individually-tracked fork

`equipment_models.tracking_type` (`individual | consumable`) determines which of `item_id`
(FK `equipment_items`) or `model_id` + `quantity` a line uses — enforced by a Zod
`.refine()` (`exactly one of itemId/modelId`) at the schema layer and mirrored in every
line-item table's application logic (not a DB CHECK constraint, since Postgres can't easily
express "exactly one of two nullable FKs" alongside the type-specific quantity requirement
without duplicating the Zod rule in SQL).

## Transfer lifecycle

`draft → submitted → approved → in_transit → completed`, with `submitted → rejected` and
`(draft|submitted|approved|in_transit) → cancelled` branches, and `approved|in_transit →
failed` if `executeTransfer` throws partway through (0043).

## QR/Barcode (Module 3.4)

`warehouse_location_codes` mirrors `equipment_item_codes` (Module 2) exactly — one row per
issued code, `is_active` + `superseded_at` tracking supersession, a partial unique index
enforcing at most one active code per `(location, type)`. A location's code value is its
`full_code`; an item's is its `asset_tag` — both are already-unique, human-readable
identifiers, so no extra "codes" indirection is needed to resolve a scan back to an entity.
`scanService.resolveScan()` is the single entry point: try a location-code lookup, then an
item asset-tag lookup, then report `not_found` — every outcome (including `not_found`) is
audited.

Scanning throughout the UI (`ScanInput`, `LineItemsField`'s `enableScan`, the picking
screen, bulk-move-by-scan) is keyboard-wedge/handheld-scanner based — no camera/QR-decoding
library is in the dependency tree. See `10-live-testing-checklist.md` if camera-based
scanning becomes a requirement later.

## Multi-tenancy

**None.** This is a single-company ERP (`company_profile` is a singleton); there is no
`organization_id`/tenant column anywhere in the schema. This was a deliberate decision
documented in the original Module 3 design and reaffirmed during Module 3.5 — see
`07-testing-report.md` for the full note.

## Multi-currency

The Warehouse module carries no currency/cost fields of its own. `warehouse_receiving_records`
optionally links to `equipment_purchases` (via `purchase_id`) for `sourceType =
'purchase_order'`, and `equipment_purchases` is where `currency_code` +
snapshotted `exchange_rate_id` actually live (Module 1/2). Dispatch and transfer move
already-valued stock and don't create new cost basis, so they carry no currency fields by
design. See `07-testing-report.md` §6 for the full verification.
