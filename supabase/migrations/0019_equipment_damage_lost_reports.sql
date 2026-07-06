-- 0019_equipment_damage_lost_reports: incident tracking. Also wires up the
-- damage_report_id FK on equipment_maintenance_records left dangling by 0018, since a
-- repair maintenance record commonly stems from a damage report.

create table public.equipment_damage_reports (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.equipment_items (id),
  reported_by uuid references public.profiles (id),
  reported_date date not null default current_date,
  description text not null,
  severity text not null check (severity in ('minor', 'major', 'critical')),
  status text not null default 'reported' check (status in ('reported', 'under_repair', 'repaired', 'written_off')),
  repair_cost numeric(14, 2),
  currency_code text references public.currencies (code),
  resolved_date date,
  resolution_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id),
  updated_by uuid references public.profiles (id),
  deleted_at timestamptz,
  deleted_by uuid references public.profiles (id),
  constraint equipment_damage_reports_cost_currency_ck
    check ((repair_cost is null) = (currency_code is null))
);

comment on table public.equipment_damage_reports is 'Damage incidents reported against an item.';

create index equipment_damage_reports_item_id_idx on public.equipment_damage_reports (item_id);
create index equipment_damage_reports_reported_by_idx on public.equipment_damage_reports (reported_by);
create index equipment_damage_reports_status_idx on public.equipment_damage_reports (status);
create index equipment_damage_reports_created_by_idx on public.equipment_damage_reports (created_by);
create index equipment_damage_reports_updated_by_idx on public.equipment_damage_reports (updated_by);
create index equipment_damage_reports_deleted_by_idx on public.equipment_damage_reports (deleted_by);

create trigger set_equipment_damage_reports_updated_at
  before update on public.equipment_damage_reports
  for each row
  execute function public.set_updated_at();

alter table public.equipment_maintenance_records
  add constraint equipment_maintenance_records_damage_report_id_fkey
  foreign key (damage_report_id) references public.equipment_damage_reports (id);

create table public.equipment_lost_reports (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.equipment_items (id),
  reported_by uuid references public.profiles (id),
  reported_date date not null default current_date,
  last_known_location_id uuid references public.storage_locations (id),
  description text,
  status text not null default 'reported' check (status in ('reported', 'investigating', 'found', 'written_off')),
  resolution_date date,
  resolution_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id),
  updated_by uuid references public.profiles (id),
  deleted_at timestamptz,
  deleted_by uuid references public.profiles (id)
);

comment on table public.equipment_lost_reports is 'Loss incidents reported against an item.';

create index equipment_lost_reports_item_id_idx on public.equipment_lost_reports (item_id);
create index equipment_lost_reports_reported_by_idx on public.equipment_lost_reports (reported_by);
create index equipment_lost_reports_last_known_location_id_idx on public.equipment_lost_reports (last_known_location_id);
create index equipment_lost_reports_status_idx on public.equipment_lost_reports (status);
create index equipment_lost_reports_created_by_idx on public.equipment_lost_reports (created_by);
create index equipment_lost_reports_updated_by_idx on public.equipment_lost_reports (updated_by);
create index equipment_lost_reports_deleted_by_idx on public.equipment_lost_reports (deleted_by);

create trigger set_equipment_lost_reports_updated_at
  before update on public.equipment_lost_reports
  for each row
  execute function public.set_updated_at();

alter table public.equipment_damage_reports enable row level security;
alter table public.equipment_lost_reports enable row level security;

create policy "equipment_damage_reports_select_viewers"
  on public.equipment_damage_reports for select
  to authenticated
  using (public.has_permission((select auth.uid()), 'inventory.view'));

create policy "equipment_damage_reports_insert_maintainers"
  on public.equipment_damage_reports for insert
  to authenticated
  with check (
    public.has_permission((select auth.uid()), 'inventory.maintenance.manage')
    or public.has_permission((select auth.uid()), 'inventory.manage')
  );

create policy "equipment_damage_reports_update_maintainers"
  on public.equipment_damage_reports for update
  to authenticated
  using (
    public.has_permission((select auth.uid()), 'inventory.maintenance.manage')
    or public.has_permission((select auth.uid()), 'inventory.manage')
  )
  with check (
    public.has_permission((select auth.uid()), 'inventory.maintenance.manage')
    or public.has_permission((select auth.uid()), 'inventory.manage')
  );

create policy "equipment_damage_reports_delete_maintainers"
  on public.equipment_damage_reports for delete
  to authenticated
  using (
    public.has_permission((select auth.uid()), 'inventory.maintenance.manage')
    or public.has_permission((select auth.uid()), 'inventory.manage')
  );

create policy "equipment_lost_reports_select_viewers"
  on public.equipment_lost_reports for select
  to authenticated
  using (public.has_permission((select auth.uid()), 'inventory.view'));

create policy "equipment_lost_reports_insert_maintainers"
  on public.equipment_lost_reports for insert
  to authenticated
  with check (
    public.has_permission((select auth.uid()), 'inventory.maintenance.manage')
    or public.has_permission((select auth.uid()), 'inventory.manage')
  );

create policy "equipment_lost_reports_update_maintainers"
  on public.equipment_lost_reports for update
  to authenticated
  using (
    public.has_permission((select auth.uid()), 'inventory.maintenance.manage')
    or public.has_permission((select auth.uid()), 'inventory.manage')
  )
  with check (
    public.has_permission((select auth.uid()), 'inventory.maintenance.manage')
    or public.has_permission((select auth.uid()), 'inventory.manage')
  );

create policy "equipment_lost_reports_delete_maintainers"
  on public.equipment_lost_reports for delete
  to authenticated
  using (
    public.has_permission((select auth.uid()), 'inventory.maintenance.manage')
    or public.has_permission((select auth.uid()), 'inventory.manage')
  );
