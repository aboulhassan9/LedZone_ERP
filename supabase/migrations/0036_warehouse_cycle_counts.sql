-- 0036_warehouse_cycle_counts: variance is a generated column (counted_qty - expected_qty),
-- so it can never drift from the two inputs it's derived from. Applying the adjustment
-- (updating equipment_items/consumable_stock_levels to match the count) is a transactional
-- function (0040), not something this migration does directly.

create table public.warehouse_cycle_counts (
  id uuid primary key default gen_random_uuid(),
  warehouse_id uuid not null references public.warehouses (id),
  scope_type text not null check (
    scope_type in (
      'random', 'scheduled', 'category', 'warehouse', 'zone', 'rack', 'bin', 'equipment', 'consumables'
    )
  ),
  scope_location_id uuid references public.warehouse_locations (id),
  status text not null default 'scheduled' check (
    status in ('scheduled', 'in_progress', 'pending_approval', 'approved', 'cancelled')
  ),
  scheduled_date date,
  started_at timestamptz,
  completed_at timestamptz,
  created_by uuid references public.profiles (id),
  approved_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

comment on table public.warehouse_cycle_counts is
  'Cycle count header. scope_location_id narrows scope_type in (zone|rack|bin) to a specific node.';

create table public.warehouse_cycle_count_lines (
  id uuid primary key default gen_random_uuid(),
  cycle_count_id uuid not null references public.warehouse_cycle_counts (id),
  item_id uuid references public.equipment_items (id),
  model_id uuid references public.equipment_models (id),
  expected_qty numeric(14, 2) not null,
  counted_qty numeric(14, 2),
  variance numeric(14, 2) generated always as (counted_qty - expected_qty) stored,
  adjustment_applied boolean not null default false,
  created_at timestamptz not null default now(),
  constraint warehouse_cycle_count_lines_item_xor_model check (
    (item_id is not null and model_id is null) or (item_id is null and model_id is not null)
  )
);

create index warehouse_cycle_counts_warehouse_id_idx on public.warehouse_cycle_counts (warehouse_id);
create index warehouse_cycle_counts_scope_location_id_idx on public.warehouse_cycle_counts (scope_location_id);
create index warehouse_cycle_counts_status_idx on public.warehouse_cycle_counts (status);
create index warehouse_cycle_counts_created_by_idx on public.warehouse_cycle_counts (created_by);

create index warehouse_cycle_count_lines_cycle_count_id_idx on public.warehouse_cycle_count_lines (cycle_count_id);
create index warehouse_cycle_count_lines_item_id_idx on public.warehouse_cycle_count_lines (item_id);
create index warehouse_cycle_count_lines_model_id_idx on public.warehouse_cycle_count_lines (model_id);

alter table public.warehouse_cycle_counts enable row level security;
alter table public.warehouse_cycle_count_lines enable row level security;

create policy "warehouse_cycle_counts_select_viewers"
  on public.warehouse_cycle_counts for select
  to authenticated
  using (public.has_permission((select auth.uid()), 'warehouse.view'));

create policy "warehouse_cycle_counts_insert_counters"
  on public.warehouse_cycle_counts for insert
  to authenticated
  with check (
    public.has_permission((select auth.uid()), 'warehouse.manage')
    or public.has_permission((select auth.uid()), 'warehouse.count')
  );

-- Covers both ordinary counting (count permission) and the approval transition (approve
-- permission) — the service layer enforces which specific transition each may perform.
create policy "warehouse_cycle_counts_update_counters"
  on public.warehouse_cycle_counts for update
  to authenticated
  using (
    public.has_permission((select auth.uid()), 'warehouse.manage')
    or public.has_permission((select auth.uid()), 'warehouse.count')
    or public.has_permission((select auth.uid()), 'warehouse.approve')
  )
  with check (
    public.has_permission((select auth.uid()), 'warehouse.manage')
    or public.has_permission((select auth.uid()), 'warehouse.count')
    or public.has_permission((select auth.uid()), 'warehouse.approve')
  );

create policy "warehouse_cycle_count_lines_select_viewers"
  on public.warehouse_cycle_count_lines for select
  to authenticated
  using (public.has_permission((select auth.uid()), 'warehouse.view'));

create policy "warehouse_cycle_count_lines_insert_counters"
  on public.warehouse_cycle_count_lines for insert
  to authenticated
  with check (
    public.has_permission((select auth.uid()), 'warehouse.manage')
    or public.has_permission((select auth.uid()), 'warehouse.count')
  );

create policy "warehouse_cycle_count_lines_update_counters"
  on public.warehouse_cycle_count_lines for update
  to authenticated
  using (
    public.has_permission((select auth.uid()), 'warehouse.manage')
    or public.has_permission((select auth.uid()), 'warehouse.count')
    or public.has_permission((select auth.uid()), 'warehouse.approve')
  )
  with check (
    public.has_permission((select auth.uid()), 'warehouse.manage')
    or public.has_permission((select auth.uid()), 'warehouse.count')
    or public.has_permission((select auth.uid()), 'warehouse.approve')
  );
