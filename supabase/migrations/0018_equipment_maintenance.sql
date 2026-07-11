-- 0018_equipment_maintenance: planned upkeep (schedules) and what actually happened
-- (records). schedule_id/damage_report_id let a record trace back to why it happened —
-- damage_report_id is added via ALTER TABLE in 0019 once equipment_damage_reports exists.

create table public.equipment_maintenance_schedules (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.equipment_items (id),
  maintenance_type text not null,
  interval_days integer not null check (interval_days > 0),
  last_performed_date date,
  next_due_date date,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id),
  updated_by uuid references public.profiles (id),
  deleted_at timestamptz,
  deleted_by uuid references public.profiles (id)
);

comment on table public.equipment_maintenance_schedules is
  'Recurring/planned upkeep per item, e.g. "recalibrate every 180 days".';

create index equipment_maintenance_schedules_item_id_idx on public.equipment_maintenance_schedules (item_id);
create index equipment_maintenance_schedules_next_due_date_idx on public.equipment_maintenance_schedules (next_due_date);
create index equipment_maintenance_schedules_created_by_idx on public.equipment_maintenance_schedules (created_by);
create index equipment_maintenance_schedules_updated_by_idx on public.equipment_maintenance_schedules (updated_by);
create index equipment_maintenance_schedules_deleted_by_idx on public.equipment_maintenance_schedules (deleted_by);

create trigger set_equipment_maintenance_schedules_updated_at
  before update on public.equipment_maintenance_schedules
  for each row
  execute function public.set_updated_at();

create table public.equipment_maintenance_records (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.equipment_items (id),
  schedule_id uuid references public.equipment_maintenance_schedules (id),
  damage_report_id uuid, -- FK added in 0019_equipment_damage_lost_reports.sql
  performed_date date not null default current_date,
  performed_by uuid references public.profiles (id),
  technician_name text,
  maintenance_type text not null,
  description text,
  cost numeric(14, 2),
  currency_code text references public.currencies (code),
  parts_replaced jsonb,
  next_recommended_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id),
  updated_by uuid references public.profiles (id),
  deleted_at timestamptz,
  deleted_by uuid references public.profiles (id),
  constraint equipment_maintenance_records_cost_currency_ck
    check ((cost is null) = (currency_code is null))
);

comment on table public.equipment_maintenance_records is
  'What actually happened — a completed maintenance visit, whether it fulfilled a schedule, resulted from a damage report, or was ad hoc.';

create index equipment_maintenance_records_item_id_idx on public.equipment_maintenance_records (item_id);
create index equipment_maintenance_records_schedule_id_idx on public.equipment_maintenance_records (schedule_id);
create index equipment_maintenance_records_damage_report_id_idx on public.equipment_maintenance_records (damage_report_id);
create index equipment_maintenance_records_performed_by_idx on public.equipment_maintenance_records (performed_by);
create index equipment_maintenance_records_created_by_idx on public.equipment_maintenance_records (created_by);
create index equipment_maintenance_records_updated_by_idx on public.equipment_maintenance_records (updated_by);
create index equipment_maintenance_records_deleted_by_idx on public.equipment_maintenance_records (deleted_by);

create trigger set_equipment_maintenance_records_updated_at
  before update on public.equipment_maintenance_records
  for each row
  execute function public.set_updated_at();

alter table public.equipment_maintenance_schedules enable row level security;
alter table public.equipment_maintenance_records enable row level security;

create policy "equipment_maintenance_schedules_select_viewers"
  on public.equipment_maintenance_schedules for select
  to authenticated
  using (public.has_permission((select auth.uid()), 'inventory.view'));

create policy "equipment_maintenance_schedules_insert_maintainers"
  on public.equipment_maintenance_schedules for insert
  to authenticated
  with check (
    public.has_permission((select auth.uid()), 'inventory.maintenance.manage')
    or public.has_permission((select auth.uid()), 'inventory.manage')
  );

create policy "equipment_maintenance_schedules_update_maintainers"
  on public.equipment_maintenance_schedules for update
  to authenticated
  using (
    public.has_permission((select auth.uid()), 'inventory.maintenance.manage')
    or public.has_permission((select auth.uid()), 'inventory.manage')
  )
  with check (
    public.has_permission((select auth.uid()), 'inventory.maintenance.manage')
    or public.has_permission((select auth.uid()), 'inventory.manage')
  );

create policy "equipment_maintenance_schedules_delete_maintainers"
  on public.equipment_maintenance_schedules for delete
  to authenticated
  using (
    public.has_permission((select auth.uid()), 'inventory.maintenance.manage')
    or public.has_permission((select auth.uid()), 'inventory.manage')
  );

create policy "equipment_maintenance_records_select_viewers"
  on public.equipment_maintenance_records for select
  to authenticated
  using (public.has_permission((select auth.uid()), 'inventory.view'));

create policy "equipment_maintenance_records_insert_maintainers"
  on public.equipment_maintenance_records for insert
  to authenticated
  with check (
    public.has_permission((select auth.uid()), 'inventory.maintenance.manage')
    or public.has_permission((select auth.uid()), 'inventory.manage')
  );

create policy "equipment_maintenance_records_update_maintainers"
  on public.equipment_maintenance_records for update
  to authenticated
  using (
    public.has_permission((select auth.uid()), 'inventory.maintenance.manage')
    or public.has_permission((select auth.uid()), 'inventory.manage')
  )
  with check (
    public.has_permission((select auth.uid()), 'inventory.maintenance.manage')
    or public.has_permission((select auth.uid()), 'inventory.manage')
  );

create policy "equipment_maintenance_records_delete_maintainers"
  on public.equipment_maintenance_records for delete
  to authenticated
  using (
    public.has_permission((select auth.uid()), 'inventory.maintenance.manage')
    or public.has_permission((select auth.uid()), 'inventory.manage')
  );
