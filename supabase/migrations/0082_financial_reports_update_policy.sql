-- 0082_financial_reports_update_policy: financial_reports' unique index on
-- (period_type, period_start, period_end, currency_code) means regenerating an
-- already-existing period (correcting a stray expense entry, re-running after a fix) is an
-- upsert -- `insert ... on conflict do update`. Postgres RLS requires a matching UPDATE policy
-- for the conflict branch, not just the INSERT policy 0081 already added; the service-role
-- client (cron path) bypasses RLS entirely and doesn't need this, but the authenticated manual
-- path does.

create policy "financial_reports_update_managers"
  on public.financial_reports for update
  to authenticated
  using (public.has_permission((select auth.uid()), 'finance.manage'))
  with check (public.has_permission((select auth.uid()), 'finance.manage'));
