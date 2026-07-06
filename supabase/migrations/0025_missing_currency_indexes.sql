-- 0025_missing_currency_indexes: performance advisor found 3 currency_code FK columns
-- without a covering index (the one FK pattern that slipped through while every other
-- FK in this module and Module 1 was indexed).

create index equipment_damage_reports_currency_code_idx on public.equipment_damage_reports (currency_code);
create index equipment_maintenance_records_currency_code_idx on public.equipment_maintenance_records (currency_code);
create index company_profile_default_currency_idx on public.company_profile (default_currency);
