-- 0073_fleet_permissions: seeds the Fleet permission keys referenced by every RLS policy in
-- 0072 (and the additional vehicles UPDATE policy). Not granted to any role here -- grant via
-- the existing Roles admin UI.

insert into public.permissions (key, module, action, description) values
  ('fleet.view', 'fleet', 'view', 'View fleet vehicle details, maintenance, and fuel logs'),
  ('fleet.manage', 'fleet', 'manage', 'Manage fleet-specific vehicle data, maintenance, and fuel logs');
