# Planning Module

Resource Planning & Scheduling Engine — the layer that turns "what does this event need" into
model-level demand, checks it against real availability, and only creates a physical hold
(a Warehouse reservation) at the Prepared stage. Built on top of Inventory's `equipment_items`
and Warehouse's `warehouse_reservations`/`warehouse_transfer_lines`.

Database + RLS + transactional functions: `supabase/migrations/0049-0056`.
Service layer (this module): `schemas/ -> repositories/ -> services/ -> actions/`, mirroring
`modules/warehouse/`'s shape — including its own copy of `shared/{authorize,audit,run-action}.ts`
rather than a cross-module refactor.

Planning never writes `equipment_items` directly. Every lifecycle change routes through
`modules/inventory/services/equipment-item-service.ts` (EquipmentLifecycleService) via three
additive methods (`reserveEquipmentItem`, `releaseReservedEquipmentItem`, `returnEquipmentItem`),
each backed by its own `SECURITY DEFINER` RPC (0054). The 8-state workflow's multi-table writes
(Prepare/Approve/Load/Complete/Cancel) are each one atomic RPC (0055) — not a JS loop with
manual rollback.

`AvailabilityService` is the sole source of truth for equipment availability.
`ConflictDetectionService` is pure compute — it never writes; persisting a result is the
caller's job via `equipmentConflictRepository.replaceForPlan`.

UI: Module 4.3 (`app/(dashboard)/planning/*`).

Full documentation: `docs/planning/README.md`.
