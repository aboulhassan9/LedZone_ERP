-- 0042_warehouse_missing_indexes: two approved_by foreign keys (warehouse_transfers,
-- warehouse_cycle_counts) were missing their covering index, caught by the performance
-- advisor after 0031/0036 — the same kind of gap 0025 fixed for Inventory.

create index warehouse_transfers_approved_by_idx on public.warehouse_transfers (approved_by);
create index warehouse_cycle_counts_approved_by_idx on public.warehouse_cycle_counts (approved_by);
