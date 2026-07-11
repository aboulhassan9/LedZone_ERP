-- 0035_warehouse_picking: pick lists feeding a dispatch. Route optimization and completion
-- reports are computed/reporting concerns built on top of these tables (0041 views + the
-- service layer), not separate schema.

create table public.warehouse_pick_lists (
  id uuid primary key default gen_random_uuid(),
  warehouse_id uuid not null references public.warehouses (id),
  method text not null default 'manual' check (
    method in ('fifo', 'lifo', 'manual', 'optimized', 'category', 'priority')
  ),
  status text not null default 'pending' check (
    status in ('pending', 'in_progress', 'completed', 'cancelled')
  ),
  assigned_to uuid references public.profiles (id),
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

comment on table public.warehouse_pick_lists is
  'A pick list assigns work to prepare a set of items/consumables (typically ahead of a dispatch).';

create table public.warehouse_pick_list_lines (
  id uuid primary key default gen_random_uuid(),
  pick_list_id uuid not null references public.warehouse_pick_lists (id),
  item_id uuid references public.equipment_items (id),
  model_id uuid references public.equipment_models (id),
  quantity numeric(14, 2),
  picked boolean not null default false,
  picked_at timestamptz,
  created_at timestamptz not null default now(),
  constraint warehouse_pick_list_lines_item_xor_model check (
    (item_id is not null and model_id is null) or (item_id is null and model_id is not null)
  )
);

create index warehouse_pick_lists_warehouse_id_idx on public.warehouse_pick_lists (warehouse_id);
create index warehouse_pick_lists_assigned_to_idx on public.warehouse_pick_lists (assigned_to);
create index warehouse_pick_lists_status_idx on public.warehouse_pick_lists (status);
create index warehouse_pick_lists_created_by_idx on public.warehouse_pick_lists (created_by);

create index warehouse_pick_list_lines_pick_list_id_idx on public.warehouse_pick_list_lines (pick_list_id);
create index warehouse_pick_list_lines_item_id_idx on public.warehouse_pick_list_lines (item_id);
create index warehouse_pick_list_lines_model_id_idx on public.warehouse_pick_list_lines (model_id);

alter table public.warehouse_pick_lists enable row level security;
alter table public.warehouse_pick_list_lines enable row level security;

create policy "warehouse_pick_lists_select_viewers"
  on public.warehouse_pick_lists for select
  to authenticated
  using (public.has_permission((select auth.uid()), 'warehouse.view'));

create policy "warehouse_pick_lists_insert_pickers"
  on public.warehouse_pick_lists for insert
  to authenticated
  with check (
    public.has_permission((select auth.uid()), 'warehouse.manage')
    or public.has_permission((select auth.uid()), 'warehouse.pick')
  );

create policy "warehouse_pick_lists_update_pickers"
  on public.warehouse_pick_lists for update
  to authenticated
  using (
    public.has_permission((select auth.uid()), 'warehouse.manage')
    or public.has_permission((select auth.uid()), 'warehouse.pick')
  )
  with check (
    public.has_permission((select auth.uid()), 'warehouse.manage')
    or public.has_permission((select auth.uid()), 'warehouse.pick')
  );

create policy "warehouse_pick_list_lines_select_viewers"
  on public.warehouse_pick_list_lines for select
  to authenticated
  using (public.has_permission((select auth.uid()), 'warehouse.view'));

create policy "warehouse_pick_list_lines_insert_pickers"
  on public.warehouse_pick_list_lines for insert
  to authenticated
  with check (
    public.has_permission((select auth.uid()), 'warehouse.manage')
    or public.has_permission((select auth.uid()), 'warehouse.pick')
  );

create policy "warehouse_pick_list_lines_update_pickers"
  on public.warehouse_pick_list_lines for update
  to authenticated
  using (
    public.has_permission((select auth.uid()), 'warehouse.manage')
    or public.has_permission((select auth.uid()), 'warehouse.pick')
  )
  with check (
    public.has_permission((select auth.uid()), 'warehouse.manage')
    or public.has_permission((select auth.uid()), 'warehouse.pick')
  );
