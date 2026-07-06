-- 0039_warehouse_permissions: seeds the Warehouse Management permission keys referenced by
-- every RLS policy in 0027-0038. Not granted to any role here — grant them to roles through
-- the existing Roles admin UI (Module 1), same as every other permission.

insert into public.permissions (key, module, action, description) values
  ('warehouse.view', 'warehouse', 'view', 'View warehouses, layout, transfers, receiving, dispatch, picking, counts, and reports'),
  ('warehouse.manage', 'warehouse', 'manage', 'Full management of warehouses and all warehouse workflows'),
  ('warehouse.create', 'warehouse', 'create', 'Create warehouses'),
  ('warehouse.update', 'warehouse', 'update', 'Edit warehouse details'),
  ('warehouse.delete', 'warehouse', 'delete', 'Archive warehouses'),
  ('warehouse.transfer', 'warehouse', 'transfer', 'Request and edit warehouse-to-warehouse/location transfers'),
  ('warehouse.receive', 'warehouse', 'receive', 'Record receiving of equipment/consumables into a warehouse'),
  ('warehouse.dispatch', 'warehouse', 'dispatch', 'Record dispatch of equipment/consumables out of a warehouse'),
  ('warehouse.pick', 'warehouse', 'pick', 'Create and fulfil pick lists'),
  ('warehouse.count', 'warehouse', 'count', 'Perform cycle counts'),
  ('warehouse.audit', 'warehouse', 'audit', 'View the warehouse audit trail'),
  ('warehouse.print', 'warehouse', 'print', 'Print warehouse documents (packing lists, manifests, delivery notes)'),
  ('warehouse.labels', 'warehouse', 'labels', 'Print location QR/barcode labels'),
  ('warehouse.reports', 'warehouse', 'reports', 'View warehouse reports'),
  ('warehouse.capacity', 'warehouse', 'capacity', 'View warehouse capacity and occupancy'),
  ('warehouse.mobile', 'warehouse', 'mobile', 'Manage mobile truck warehouses'),
  ('warehouse.settings', 'warehouse', 'settings', 'Manage warehouse module settings'),
  ('warehouse.approve', 'warehouse', 'approve', 'Approve transfers and cycle count adjustments'),
  ('warehouse.location.manage', 'warehouse', 'location_manage', 'Create/edit the zone/row/rack/shelf layout'),
  ('warehouse.bin.manage', 'warehouse', 'bin_manage', 'Create/edit bins specifically'),
  ('warehouse.qr.scan', 'warehouse', 'qr_scan', 'Scan a location QR code to move/verify/receive/dispatch/count'),
  ('warehouse.qr.generate', 'warehouse', 'qr_generate', 'Generate QR/barcode labels for a location'),
  ('warehouse.bulk.move', 'warehouse', 'bulk_move', 'Perform a bulk move across multiple items/locations'),
  ('warehouse.bulk.update', 'warehouse', 'bulk_update', 'Perform a bulk update across multiple warehouse records');
