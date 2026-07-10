-- 0059_crm_permissions: seeds the CRM permission keys referenced by every RLS policy in
-- 0057-0058. Not granted to any role here -- grant via the existing Roles admin UI.

insert into public.permissions (key, module, action, description) values
  ('crm.view', 'crm', 'view', 'View customers, contacts, and quotes'),
  ('crm.manage', 'crm', 'manage', 'Full management of CRM records'),
  ('crm.create', 'crm', 'create', 'Create customers and contacts'),
  ('crm.update', 'crm', 'update', 'Edit customers and contacts'),
  ('crm.delete', 'crm', 'delete', 'Archive customers'),
  ('crm.quotes.manage', 'crm', 'quotes_manage', 'Create/edit/send quotes');
