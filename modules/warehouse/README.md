# Warehouse Module

Multi-warehouse layout (Zone/Row/Rack/Shelf/Bin + staging/loading/repair/quarantine areas),
transfers, receiving, dispatch, picking, cycle counts, reservations, and documents, built on
top of the Inventory Foundation's `equipment_items`/`consumable_stock_levels`.

Database + RLS + transactional functions: `supabase/migrations/0027-0042`.
Service layer (this module): `schemas/ -> repositories/ -> services/ -> actions/`, mirroring
`modules/inventory/`'s shape.

WarehouseService only ever manages location/workflow bookkeeping. Any equipment state or
location change flows through `modules/inventory/services/equipment-item-service.ts`
(EquipmentLifecycleService) or one of the Module 3.1 transactional functions it now also
wraps for warehouse-triggered movement types — never a direct table write. See
`warehouse-transfer-service.ts`'s `executeTransfer` for the fullest explanation of that
boundary.

UI not yet implemented — Module 3.3.
