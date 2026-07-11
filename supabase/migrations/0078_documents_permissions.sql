-- 0078_documents_permissions: seeds the Documents permission keys referenced by every RLS
-- policy in 0077 (table and storage). Not granted to any role here -- grant via the existing
-- Roles admin UI.

insert into public.permissions (key, module, action, description) values
  ('documents.view', 'documents', 'view', 'View and download documents'),
  ('documents.manage', 'documents', 'manage', 'Upload/generate documents and record signatures');
