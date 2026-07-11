-- 0023_equipment_permissions: seeds the Inventory Foundation permission keys referenced
-- by every RLS policy in 0012-0022. Not granted to any role here — grant them to roles
-- through the existing Roles admin UI (Module 1), same as every other permission.

insert into public.permissions (key, module, action, description) values
  ('inventory.view', 'inventory', 'view', 'View the equipment catalog, items, status, location, and non-financial attachments'),
  ('inventory.manage', 'inventory', 'manage', 'Create/edit categories, manufacturers, brands, suppliers, models, items, storage locations, codes, attachments'),
  ('inventory.financials.view', 'inventory', 'financials_view', 'View purchase cost, depreciation inputs, valuations, and purchase invoice attachments'),
  ('inventory.maintenance.manage', 'inventory', 'maintenance_manage', 'Log maintenance records, damage reports, and lost reports'),
  ('inventory.checkout', 'inventory', 'checkout', 'Perform an equipment check-out movement'),
  ('inventory.checkin', 'inventory', 'checkin', 'Perform an equipment check-in movement'),
  ('inventory.transfer', 'inventory', 'transfer', 'Perform an equipment location transfer'),
  ('inventory.qr.scan', 'inventory', 'qr_scan', 'Log an equipment scan via QR code'),
  ('inventory.barcode.scan', 'inventory', 'barcode_scan', 'Log an equipment scan via barcode');
