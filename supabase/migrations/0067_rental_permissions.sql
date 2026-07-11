-- 0067_rental_permissions: seeds the Rental permission keys referenced by every RLS policy in
-- 0066. Not granted to any role here -- grant via the existing Roles admin UI.

insert into public.permissions (key, module, action, description) values
  ('rental.view', 'rental', 'view', 'View rental agreements'),
  ('rental.manage', 'rental', 'manage', 'Full management of rental agreements'),
  ('rental.create', 'rental', 'create', 'Create rental agreements'),
  ('rental.update', 'rental', 'update', 'Edit rental agreements and set status'),
  ('rental.delete', 'rental', 'delete', 'Archive rental agreements');
