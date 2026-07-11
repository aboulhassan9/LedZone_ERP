-- 0031_warehouse_transfers: Warehouse<->Warehouse (and Zone/Rack/Shelf-to-any, via the
-- optional from/to_location_id) transfers, with an approval workflow. A transfer's lines
-- reference either an individually-tracked equipment_items row or an equipment_models
-- (consumable) + quantity — exactly one of the two per line, same fork used throughout
-- Inventory (tracking_type individual|consumable).

create table public.warehouse_transfers (
  id uuid primary key default gen_random_uuid(),
  from_warehouse_id uuid not null references public.warehouses (id),
  to_warehouse_id uuid not null references public.warehouses (id),
  from_location_id uuid references public.warehouse_locations (id),
  to_location_id uuid references public.warehouse_locations (id),
  status text not null default 'pending' check (
    status in ('pending', 'approved', 'in_transit', 'completed', 'cancelled')
  ),
  requested_by uuid references public.profiles (id),
  approved_by uuid references public.profiles (id),
  requested_at timestamptz not null default now(),
  approved_at timestamptz,
  completed_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id),
  updated_by uuid references public.profiles (id),
  deleted_at timestamptz,
  deleted_by uuid references public.profiles (id)
);

comment on table public.warehouse_transfers is
  'Transfer header: warehouse-to-warehouse (or location-to-location within/across warehouses), with a pending->approved->in_transit->completed|cancelled workflow.';

create table public.warehouse_transfer_lines (
  id uuid primary key default gen_random_uuid(),
  transfer_id uuid not null references public.warehouse_transfers (id),
  item_id uuid references public.equipment_items (id),
  model_id uuid references public.equipment_models (id),
  quantity numeric(14, 2),
  status text not null default 'pending' check (
    status in ('pending', 'in_transit', 'received', 'cancelled')
  ),
  created_at timestamptz not null default now(),
  constraint warehouse_transfer_lines_item_xor_model check (
    (item_id is not null and model_id is null) or (item_id is null and model_id is not null)
  )
);

comment on table public.warehouse_transfer_lines is
  'One line per unit (item_id) or consumable quantity (model_id + quantity) moved by a transfer. Exactly one of item_id/model_id is set per line.';

create index warehouse_transfers_from_warehouse_id_idx on public.warehouse_transfers (from_warehouse_id);
create index warehouse_transfers_to_warehouse_id_idx on public.warehouse_transfers (to_warehouse_id);
create index warehouse_transfers_from_location_id_idx on public.warehouse_transfers (from_location_id);
create index warehouse_transfers_to_location_id_idx on public.warehouse_transfers (to_location_id);
create index warehouse_transfers_status_idx on public.warehouse_transfers (status);
create index warehouse_transfers_requested_by_idx on public.warehouse_transfers (requested_by);
create index warehouse_transfers_created_by_idx on public.warehouse_transfers (created_by);
create index warehouse_transfers_updated_by_idx on public.warehouse_transfers (updated_by);
create index warehouse_transfers_deleted_by_idx on public.warehouse_transfers (deleted_by);

create index warehouse_transfer_lines_transfer_id_idx on public.warehouse_transfer_lines (transfer_id);
create index warehouse_transfer_lines_item_id_idx on public.warehouse_transfer_lines (item_id);
create index warehouse_transfer_lines_model_id_idx on public.warehouse_transfer_lines (model_id);

create trigger set_warehouse_transfers_updated_at
  before update on public.warehouse_transfers
  for each row
  execute function public.set_updated_at();

alter table public.warehouse_transfers enable row level security;
alter table public.warehouse_transfer_lines enable row level security;

create policy "warehouse_transfers_select_viewers"
  on public.warehouse_transfers for select
  to authenticated
  using (public.has_permission((select auth.uid()), 'warehouse.view'));

create policy "warehouse_transfers_insert_requesters"
  on public.warehouse_transfers for insert
  to authenticated
  with check (
    public.has_permission((select auth.uid()), 'warehouse.manage')
    or public.has_permission((select auth.uid()), 'warehouse.transfer')
  );

-- Covers both ordinary edits (transfer permission) and approval-status changes (approve
-- permission) — the service layer enforces which specific transition each permission may
-- perform, same pattern as Inventory's transactional functions.
create policy "warehouse_transfers_update_requesters"
  on public.warehouse_transfers for update
  to authenticated
  using (
    public.has_permission((select auth.uid()), 'warehouse.manage')
    or public.has_permission((select auth.uid()), 'warehouse.transfer')
    or public.has_permission((select auth.uid()), 'warehouse.approve')
  )
  with check (
    public.has_permission((select auth.uid()), 'warehouse.manage')
    or public.has_permission((select auth.uid()), 'warehouse.transfer')
    or public.has_permission((select auth.uid()), 'warehouse.approve')
  );

create policy "warehouse_transfer_lines_select_viewers"
  on public.warehouse_transfer_lines for select
  to authenticated
  using (public.has_permission((select auth.uid()), 'warehouse.view'));

create policy "warehouse_transfer_lines_insert_requesters"
  on public.warehouse_transfer_lines for insert
  to authenticated
  with check (
    public.has_permission((select auth.uid()), 'warehouse.manage')
    or public.has_permission((select auth.uid()), 'warehouse.transfer')
  );

create policy "warehouse_transfer_lines_update_requesters"
  on public.warehouse_transfer_lines for update
  to authenticated
  using (
    public.has_permission((select auth.uid()), 'warehouse.manage')
    or public.has_permission((select auth.uid()), 'warehouse.transfer')
  )
  with check (
    public.has_permission((select auth.uid()), 'warehouse.manage')
    or public.has_permission((select auth.uid()), 'warehouse.transfer')
  );
