-- 0053_planning_permissions: seeds the Resource Planning & Scheduling permission keys
-- referenced by every RLS policy in 0049-0052. Not granted to any role here -- grant via the
-- existing Roles admin UI, same as every other module.

insert into public.permissions (key, module, action, description) values
  ('planning.view', 'planning', 'view', 'View plans, availability, conflicts, and assignments'),
  ('planning.manage', 'planning', 'manage', 'Full management of plans and all planning workflows'),
  ('planning.create', 'planning', 'create', 'Create equipment plans'),
  ('planning.update', 'planning', 'update', 'Edit plan details and demand lines'),
  ('planning.delete', 'planning', 'delete', 'Archive equipment plans'),
  ('planning.approve', 'planning', 'approve', 'Approve a plan (Ready -> Approved)'),
  ('planning.prepare', 'planning', 'prepare', 'Assign specific equipment and create reservations (Approved -> Prepared)'),
  ('planning.load', 'planning', 'load', 'Mark a plan as loaded/dispatched (Prepared -> Loaded)'),
  ('planning.complete', 'planning', 'complete', 'Mark a plan as completed (Loaded -> Completed)'),
  ('planning.cancel', 'planning', 'cancel', 'Cancel a plan from any pre-Loaded status'),
  ('planning.assign.crew', 'planning', 'assign_crew', 'Manage crew directory and crew bookings on a plan'),
  ('planning.assign.vehicle', 'planning', 'assign_vehicle', 'Manage vehicle directory and vehicle bookings on a plan'),
  ('planning.reports', 'planning', 'reports', 'View planning reports (seeded, not yet wired to any feature)');
