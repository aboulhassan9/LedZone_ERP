-- 0079_reports_permissions: Module 12 (Reports) is read-only cross-module aggregation --
-- inventory utilization, financials, and event profitability -- with no domain state of its
-- own, so it needs no new tables, only a single permission key gating the report pages. Not
-- granted to any role here -- grant via the existing Roles admin UI.

insert into public.permissions (key, module, action, description) values
  ('reports.view', 'reports', 'view', 'View cross-module reports and dashboards');
