# Warehouse Module — Service & Server Action Reference

Every Server Action (`"use server"`) is a thin wrapper: `runAction(() => service.method())` +
`revalidatePath(...)`. It returns `ActionResult<T>` — `{ success: true, data: T }` or
`{ success: false, error: { code, message } }` — never throws (domain errors are caught by
`runAction`; anything else is a real bug and propagates to Next.js's error handling).

All permission keys below are OR'd with `warehouse.manage` (the blanket override) unless
noted otherwise. Full permission-to-RLS cross-check: `07-testing-report.md` §2.

## WarehouseService (`warehouse-service.ts` / `warehouse-actions.ts`)

| Action | Permission | Notes |
|---|---|---|
| `createWarehouseAction` | `warehouse.create` | |
| `updateWarehouseAction` | `warehouse.update` | |
| `archiveWarehouseAction` | `warehouse.delete` | Soft-delete |
| `setDefaultWarehouseAction` | `warehouse.manage` only | Unsets any other default |

## WarehouseLocationService (`warehouse-location-service.ts` / `warehouse-location-actions.ts`)

| Action | Permission | Notes |
|---|---|---|
| `createWarehouseLocationAction` | `warehouse.location.manage` | Validates `ALLOWED_PARENT_TYPES` hierarchy rule |
| `updateWarehouseLocationAction` | `warehouse.location.manage` | |
| `archiveWarehouseLocationAction` | `warehouse.location.manage` | |
| `getLocationContentsAction` | none (direct repository read, RLS-protected) | Powers the tree explorer's contents preview |

Also exposes (not Server Actions, called internally): `assertCapacity`, `ensureStorageLocationBridge`.

## WarehouseTransferService (`warehouse-transfer-service.ts` / `warehouse-transfer-actions.ts`)

| Action | Permission | Transition |
|---|---|---|
| `createTransferRequestAction` | `warehouse.transfer` | → `draft` |
| `submitTransferAction` | `warehouse.transfer` | `draft` → `submitted` |
| `approveTransferAction` | `warehouse.approve` | `submitted` → `approved` |
| `rejectTransferAction` | `warehouse.approve` | `submitted` → `rejected` |
| `cancelTransferAction` | `warehouse.transfer` | `(draft\|submitted\|approved\|in_transit)` → `cancelled` |
| `executeTransferAction` | `warehouse.transfer` | `(approved\|in_transit)` → `completed`, or → `failed` on error |

Line completion goes through `complete_warehouse_transfer_line` (0040), not
`equipmentItemService` — see `01-architecture.md`'s lifecycle boundary section.

## ReceivingService (`receiving-service.ts` / `receiving-actions.ts`)

| Action | Permission | Notes |
|---|---|---|
| `createReceivingAction` | `warehouse.receive` | `purchase_order` source requires `purchaseId` |
| `completeReceivingLineAction` | `warehouse.receive` | Via `complete_warehouse_receiving_line` |
| `recordLineDamageAction` | `warehouse.receive` | Delegates to Inventory's `incidentService.createDamageReport` |

## DispatchService (`dispatch-service.ts` / `dispatch-actions.ts`)

| Action | Permission | Notes |
|---|---|---|
| `createDispatchAction` | `warehouse.dispatch` | Validates item availability / consumable stock at creation time |
| `completeDispatchLineAction` | `warehouse.dispatch` | Via `complete_warehouse_dispatch_line` |
| `attachSignatureAction` | `warehouse.dispatch` | Sets `signature_url` directly (no transactional RPC needed — single-column update) |

## PickingService (`picking-service.ts` / `picking-actions.ts`)

| Action | Permission | Notes |
|---|---|---|
| `createPickListAction` | `warehouse.pick` | Auto-reserves each item line via ReservationService |
| `completePickLineAction` | `warehouse.pick` | Relocation (if a destination is given) via `equipmentItemService.pickEquipmentItem` |
| `startPickListAction` | `warehouse.pick` | No current-status guard (see `07-testing-report.md` §1) |

## ReservationService (`reservation-service.ts` / `reservation-actions.ts`)

| Action | Permission | Notes |
|---|---|---|
| `createReservationAction` | `warehouse.location.manage` | Item: rejects if an active reservation exists (app-level check, no DB unique index — see `07-testing-report.md` §1) |
| `releaseReservationAction` | `warehouse.location.manage` | |

## CycleCountService (`cycle-count-service.ts` / `cycle-count-actions.ts`)

| Action | Permission | Transition |
|---|---|---|
| `createCycleCountAction` | `warehouse.count` | → `scheduled` |
| `startCycleCountAction` | `warehouse.count` | `scheduled` → `in_progress` |
| `recordCountAction` | `warehouse.count` | Sets `counted_qty`; `variance` is a DB-generated column |
| `submitForApprovalAction` | `warehouse.count` | `in_progress` → `pending_approval` (all lines must be counted) |
| `approveCycleCountAction` | `warehouse.approve` | `pending_approval` → `approved`; applies consumable adjustments, files lost reports for missing individually-tracked items |

## WarehouseDocumentService (`warehouse-document-service.ts` / `warehouse-document-actions.ts`)

| Action | Permission | Notes |
|---|---|---|
| `uploadWarehouseDocumentAction` | entity-specific (`PERMISSIONS_BY_ENTITY` map) | Storage upload, then metadata insert; rolls back the file if metadata insert fails |
| `archiveWarehouseDocumentAction` | entity-specific | Soft-delete only, file stays in storage |

## WarehouseLocationCodeService (`warehouse-location-code-service.ts` / `warehouse-location-code-actions.ts`) — Module 3.4

| Action | Permission | Notes |
|---|---|---|
| `assignLocationQrCodeAction` | `warehouse.qr.generate` | Code value = location's `full_code` |
| `assignLocationBarcodeAction` | `warehouse.qr.generate` | |
| `listActiveLocationCodesAction` | `warehouse.view` | |

## ScanService (`scan-service.ts` / `scan-actions.ts`) — Module 3.4

| Action | Permission | Notes |
|---|---|---|
| `resolveScanAction` | `warehouse.qr.scan` or `warehouse.view` | Returns `{type: "location"\|"item"\|"not_found"}`; every outcome is audited |

## Print pages (Module 3.4) — `app/(print)/warehouse/locations/...`

Not Server Actions — Server Components gated by `requirePermission("warehouse.view")` for
page access, with the Print button itself additionally gated by `warehouse.manage` or
`warehouse.labels` (fixed during Module 3.5 — see `07-testing-report.md` §2).
