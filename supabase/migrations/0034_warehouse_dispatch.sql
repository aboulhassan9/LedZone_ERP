-- 0034_warehouse_dispatch: outbound workflow. destination_reference is a free-text/opaque
-- pointer for now (e.g. an event name, a customer name) — future Events/Rentals modules add
-- a proper FK column here (additive), the same deferred pattern used throughout Inventory
-- (equipment_item_movements.reference_note, equipment_purchases <-> future PO module, etc.).

create table public.warehouse_dispatch_records (
  id uuid primary key default gen_random_uuid(),
  warehouse_id uuid not null references public.warehouses (id),
  destination_type text not null check (
    destination_type in ('event', 'customer', 'repair', 'warehouse', 'truck', 'vendor')
  ),
  destination_reference text,
  dispatched_by uuid references public.profiles (id),
  dispatched_at timestamptz,
  signature_url text,
  status text not null default 'pending' check (
    status in ('pending', 'packed', 'dispatched', 'cancelled')
  ),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id),
  updated_by uuid references public.profiles (id),
  deleted_at timestamptz,
  deleted_by uuid references public.profiles (id)
);

comment on table public.warehouse_dispatch_records is
  'Dispatch header: destination, signature (packing-list/manifest generation is a UI/report concern built on top of this + its lines).';

create table public.warehouse_dispatch_lines (
  id uuid primary key default gen_random_uuid(),
  dispatch_id uuid not null references public.warehouse_dispatch_records (id),
  item_id uuid references public.equipment_items (id),
  model_id uuid references public.equipment_models (id),
  quantity numeric(14, 2),
  source_warehouse_location_id uuid references public.warehouse_locations (id),
  dispatched boolean not null default false,
  created_at timestamptz not null default now(),
  constraint warehouse_dispatch_lines_item_xor_model check (
    (item_id is not null and model_id is null) or (item_id is null and model_id is not null)
  )
);

create index warehouse_dispatch_records_warehouse_id_idx on public.warehouse_dispatch_records (warehouse_id);
create index warehouse_dispatch_records_dispatched_by_idx on public.warehouse_dispatch_records (dispatched_by);
create index warehouse_dispatch_records_status_idx on public.warehouse_dispatch_records (status);
create index warehouse_dispatch_records_created_by_idx on public.warehouse_dispatch_records (created_by);
create index warehouse_dispatch_records_updated_by_idx on public.warehouse_dispatch_records (updated_by);
create index warehouse_dispatch_records_deleted_by_idx on public.warehouse_dispatch_records (deleted_by);

create index warehouse_dispatch_lines_dispatch_id_idx on public.warehouse_dispatch_lines (dispatch_id);
create index warehouse_dispatch_lines_item_id_idx on public.warehouse_dispatch_lines (item_id);
create index warehouse_dispatch_lines_model_id_idx on public.warehouse_dispatch_lines (model_id);
create index warehouse_dispatch_lines_source_idx on public.warehouse_dispatch_lines (source_warehouse_location_id);

create trigger set_warehouse_dispatch_records_updated_at
  before update on public.warehouse_dispatch_records
  for each row
  execute function public.set_updated_at();

alter table public.warehouse_dispatch_records enable row level security;
alter table public.warehouse_dispatch_lines enable row level security;

create policy "warehouse_dispatch_records_select_viewers"
  on public.warehouse_dispatch_records for select
  to authenticated
  using (public.has_permission((select auth.uid()), 'warehouse.view'));

create policy "warehouse_dispatch_records_insert_dispatchers"
  on public.warehouse_dispatch_records for insert
  to authenticated
  with check (
    public.has_permission((select auth.uid()), 'warehouse.manage')
    or public.has_permission((select auth.uid()), 'warehouse.dispatch')
  );

create policy "warehouse_dispatch_records_update_dispatchers"
  on public.warehouse_dispatch_records for update
  to authenticated
  using (
    public.has_permission((select auth.uid()), 'warehouse.manage')
    or public.has_permission((select auth.uid()), 'warehouse.dispatch')
  )
  with check (
    public.has_permission((select auth.uid()), 'warehouse.manage')
    or public.has_permission((select auth.uid()), 'warehouse.dispatch')
  );

create policy "warehouse_dispatch_lines_select_viewers"
  on public.warehouse_dispatch_lines for select
  to authenticated
  using (public.has_permission((select auth.uid()), 'warehouse.view'));

create policy "warehouse_dispatch_lines_insert_dispatchers"
  on public.warehouse_dispatch_lines for insert
  to authenticated
  with check (
    public.has_permission((select auth.uid()), 'warehouse.manage')
    or public.has_permission((select auth.uid()), 'warehouse.dispatch')
  );

create policy "warehouse_dispatch_lines_update_dispatchers"
  on public.warehouse_dispatch_lines for update
  to authenticated
  using (
    public.has_permission((select auth.uid()), 'warehouse.manage')
    or public.has_permission((select auth.uid()), 'warehouse.dispatch')
  )
  with check (
    public.has_permission((select auth.uid()), 'warehouse.manage')
    or public.has_permission((select auth.uid()), 'warehouse.dispatch')
  );
