-- 0070_finance_permissions: seeds the Finance permission keys referenced by every RLS policy in
-- 0068-0069. Not granted to any role here -- grant via the existing Roles admin UI.

insert into public.permissions (key, module, action, description) values
  ('finance.view', 'finance', 'view', 'View invoices, payments, and expenses'),
  ('finance.manage', 'finance', 'manage', 'Full management of invoices, payments, and expenses'),
  ('finance.invoices.manage', 'finance', 'invoices_manage', 'Create, edit, and record payments on invoices'),
  ('finance.expenses.manage', 'finance', 'expenses_manage', 'Create and edit expenses');
