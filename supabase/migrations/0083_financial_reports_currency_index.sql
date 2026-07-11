-- 0083_financial_reports_currency_index: performance advisor caught a missing covering index
-- on financial_reports.currency_code's FK, same standing indexing convention every other
-- table in this project follows.

create index financial_reports_currency_code_idx on public.financial_reports (currency_code);
