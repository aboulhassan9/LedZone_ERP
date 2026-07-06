-- 0033_warehouse_receiving: intake workflow. Damage found on arrival reuses Module 2's
-- existing equipment_damage_reports (via damage_report_id) instead of a second damage-report
-- table — Warehouse only records that a line arrived damaged and links to the report;
-- creating/resolving the report itself stays incident-service's job.

create table public.warehouse_receiving_records (
  id uuid primary key default gen_random_uuid(),
  warehouse_id uuid not null references public.warehouses (id),
  source_type text not null check (
    source_type in ('supplier', 'purchase_order', 'customer_return', 'repair', 'internal_transfer', 'manual')
  ),
  purchase_id uuid references public.equipment_purchases (id),
  reference_note text,
  received_by uuid references public.profiles (id),
  received_at timestamptz not null default now(),
  status text not null default 'pending' check (status in ('pending', 'inspected', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id),
  updated_by uuid references public.profiles (id),
  deleted_at timestamptz,
  deleted_by uuid references public.profiles (id)
);

comment on table public.warehouse_receiving_records is
  'Receiving header: what arrived, from where, inspected/completed status.';

create table public.warehouse_receiving_lines (
  id uuid primary key default gen_random_uuid(),
  receiving_id uuid not null references public.warehouse_receiving_records (id),
  item_id uuid references public.equipment_items (id),
  model_id uuid references public.equipment_models (id),
  quantity numeric(14, 2),
  condition_on_arrival text,
  damage_report_id uuid references public.equipment_damage_reports (id),
  destination_warehouse_location_id uuid references public.warehouse_locations (id),
  placed boolean not null default false,
  created_at timestamptz not null default now(),
  constraint warehouse_receiving_lines_item_xor_model check (
    (item_id is not null and model_id is null) or (item_id is null and model_id is not null)
  )
);

create index warehouse_receiving_records_warehouse_id_idx on public.warehouse_receiving_records (warehouse_id);
create index warehouse_receiving_records_purchase_id_idx on public.warehouse_receiving_records (purchase_id);
create index warehouse_receiving_records_received_by_idx on public.warehouse_receiving_records (received_by);
create index warehouse_receiving_records_status_idx on public.warehouse_receiving_records (status);
create index warehouse_receiving_records_created_by_idx on public.warehouse_receiving_records (created_by);
create index warehouse_receiving_records_updated_by_idx on public.warehouse_receiving_records (updated_by);
create index warehouse_receiving_records_deleted_by_idx on public.warehouse_receiving_records (deleted_by);

create index warehouse_receiving_lines_receiving_id_idx on public.warehouse_receiving_lines (receiving_id);
create index warehouse_receiving_lines_item_id_idx on public.warehouse_receiving_lines (item_id);
create index warehouse_receiving_lines_model_id_idx on public.warehouse_receiving_lines (model_id);
create index warehouse_receiving_lines_damage_report_id_idx on public.warehouse_receiving_lines (damage_report_id);
create index warehouse_receiving_lines_destination_idx on public.warehouse_receiving_lines (destination_warehouse_location_id);

create trigger set_warehouse_receiving_records_updated_at
  before update on public.warehouse_receiving_records
  for each row
  execute function public.set_updated_at();

alter table public.warehouse_receiving_records enable row level security;
alter table public.warehouse_receiving_lines enable row level security;

create policy "warehouse_receiving_records_select_viewers"
  on public.warehouse_receiving_records for select
  to authenticated
  using (public.has_permission((select auth.uid()), 'warehouse.view'));

create policy "warehouse_receiving_records_insert_receivers"
  on public.warehouse_receiving_records for insert
  to authenticated
  with check (
    public.has_permission((select auth.uid()), 'warehouse.manage')
    or public.has_permission((select auth.uid()), 'warehouse.receive')
  );

create policy "warehouse_receiving_records_update_receivers"
  on public.warehouse_receiving_records for update
  to authenticated
  using (
    public.has_permission((select auth.uid()), 'warehouse.manage')
    or public.has_permission((select auth.uid()), 'warehouse.receive')
  )
  with check (
    public.has_permission((select auth.uid()), 'warehouse.manage')
    or public.has_permission((select auth.uid()), 'warehouse.receive')
  );

create policy "warehouse_receiving_lines_select_viewers"
  on public.warehouse_receiving_lines for select
  to authenticated
  using (public.has_permission((select auth.uid()), 'warehouse.view'));

create policy "warehouse_receiving_lines_insert_receivers"
  on public.warehouse_receiving_lines for insert
  to authenticated
  with check (
    public.has_permission((select auth.uid()), 'warehouse.manage')
    or public.has_permission((select auth.uid()), 'warehouse.receive')
  );

create policy "warehouse_receiving_lines_update_receivers"
  on public.warehouse_receiving_lines for update
  to authenticated
  using (
    public.has_permission((select auth.uid()), 'warehouse.manage')
    or public.has_permission((select auth.uid()), 'warehouse.receive')
  )
  with check (
    public.has_permission((select auth.uid()), 'warehouse.manage')
    or public.has_permission((select auth.uid()), 'warehouse.receive')
  );
