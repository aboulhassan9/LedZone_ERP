-- 0062_events_permissions: seeds the Events permission keys referenced by every RLS policy in
-- 0061. Not granted to any role here -- grant via the existing Roles admin UI.

insert into public.permissions (key, module, action, description) values
  ('events.view', 'events', 'view', 'View events, checklists, and timelines'),
  ('events.manage', 'events', 'manage', 'Full management of events'),
  ('events.create', 'events', 'create', 'Create events'),
  ('events.update', 'events', 'update', 'Edit events, checklist items, and timeline items'),
  ('events.delete', 'events', 'delete', 'Archive events');
