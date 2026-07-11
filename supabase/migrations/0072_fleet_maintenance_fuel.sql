-- 0072_fleet_maintenance_fuel: Module 9 (Fleet) service history and fuel/mileage logs, both
-- new -- no existing table covers this ground (resource_assignments only records booking
-- windows, never vehicle condition or running costs).

create table public.vehicle_maintenance_records (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles (id),
  maintenance_type text not null check (
    maintenance_type in ('scheduled_service', 'repair', 'inspection', 'tire', 'other')
  ),
  description text not null,
  cost numeric(14, 2) check (cost >= 0),
  currency_code text references public.currencies (code),
  odometer_km integer check (odometer_km >= 0),
  service_date date not null default current_date,
  next_service_date date,
  performed_by text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id),
  updated_by uuid references public.profiles (id)
);

comment on table public.vehicle_maintenance_records is
  'Service/repair history for a fleet vehicle.';

create index vehicle_maintenance_records_vehicle_id_idx on public.vehicle_maintenance_records (vehicle_id);
create index vehicle_maintenance_records_service_date_idx on public.vehicle_maintenance_records (service_date);
create index vehicle_maintenance_records_created_by_idx on public.vehicle_maintenance_records (created_by);
create index vehicle_maintenance_records_updated_by_idx on public.vehicle_maintenance_records (updated_by);

create trigger set_vehicle_maintenance_records_updated_at
  before update on public.vehicle_maintenance_records
  for each row
  execute function public.set_updated_at();

create table public.vehicle_fuel_logs (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles (id),
  fuel_date date not null default current_date,
  liters numeric(10, 2) not null check (liters > 0),
  cost numeric(14, 2) not null check (cost >= 0),
  currency_code text not null references public.currencies (code),
  odometer_km integer check (odometer_km >= 0),
  notes text,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles (id)
);

comment on table public.vehicle_fuel_logs is
  'Append-only fuel/mileage log for a fleet vehicle -- same pattern as invoice_payments.';

create index vehicle_fuel_logs_vehicle_id_idx on public.vehicle_fuel_logs (vehicle_id);
create index vehicle_fuel_logs_fuel_date_idx on public.vehicle_fuel_logs (fuel_date);
create index vehicle_fuel_logs_created_by_idx on public.vehicle_fuel_logs (created_by);

alter table public.vehicle_maintenance_records enable row level security;
alter table public.vehicle_fuel_logs enable row level security;

create policy "vehicle_maintenance_records_select_viewers"
  on public.vehicle_maintenance_records for select
  to authenticated
  using (public.has_permission((select auth.uid()), 'fleet.view'));

create policy "vehicle_maintenance_records_insert_managers"
  on public.vehicle_maintenance_records for insert
  to authenticated
  with check (public.has_permission((select auth.uid()), 'fleet.manage'));

create policy "vehicle_maintenance_records_update_managers"
  on public.vehicle_maintenance_records for update
  to authenticated
  using (public.has_permission((select auth.uid()), 'fleet.manage'))
  with check (public.has_permission((select auth.uid()), 'fleet.manage'));

create policy "vehicle_fuel_logs_select_viewers"
  on public.vehicle_fuel_logs for select
  to authenticated
  using (public.has_permission((select auth.uid()), 'fleet.view'));

create policy "vehicle_fuel_logs_insert_managers"
  on public.vehicle_fuel_logs for insert
  to authenticated
  with check (public.has_permission((select auth.uid()), 'fleet.manage'));

-- Fleet also needs to write the fleet-specific columns added to `vehicles` in 0071
-- (fleet_status, maintenance/insurance/registration fields). Planning's existing
-- vehicles_update_managers policy (0050) already permits any authenticated user with
-- planning.manage/planning.assign.vehicle to update the row; this adds fleet.manage as an
-- equally valid path for the same UPDATE, without touching Planning's existing policy.
create policy "vehicles_update_fleet_managers"
  on public.vehicles for update
  to authenticated
  using (public.has_permission((select auth.uid()), 'fleet.manage'))
  with check (public.has_permission((select auth.uid()), 'fleet.manage'));
