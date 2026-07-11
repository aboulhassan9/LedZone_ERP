-- 0076_hr_permissions: seeds the HR permission keys referenced by every RLS policy in 0075
-- (and the additional crew_members UPDATE policy). Payroll is gated by its own, narrower key
-- (hr.payroll.manage) since compensation data is more sensitive than leave/performance records
-- -- same "granular sub-permission" pattern CRM used for crm.quotes.manage. Not granted to any
-- role here -- grant via the existing Roles admin UI.

insert into public.permissions (key, module, action, description) values
  ('hr.view', 'hr', 'view', 'View employee records, leave, payroll, and performance reviews'),
  ('hr.manage', 'hr', 'manage', 'Manage employee HR info, leave requests, and performance reviews'),
  ('hr.payroll.manage', 'hr', 'payroll_manage', 'Create and manage payroll records');
