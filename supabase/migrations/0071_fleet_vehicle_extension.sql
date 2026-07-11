-- 0071_fleet_vehicle_extension: Module 9 (Fleet) absorbs the `vehicles` table Planning's 0050
-- migration deliberately left minimal ("Expected to be replaced/absorbed by a future Fleet
-- module"). Additive columns only -- Planning's existing name/plate_number/vehicle_type/
-- capacity_notes/is_active fields and its own vehicle-form-dialog UI are untouched and keep
-- working exactly as before (basic directory identity, used for resource_assignments booking).
-- `fleet_status` is intentionally a separate column from `is_active`: is_active is Planning's
-- simple "bookable at all" toggle; fleet_status is the vehicle's own operational lifecycle
-- (active/maintenance/retired), owned and written by this module. Confirmed zero existing rows
-- before this migration -- purely additive regardless, but checked per this project's standing
-- practice.

alter table public.vehicles
  add column make text,
  add column model text,
  add column year integer,
  add column vin text,
  add column fuel_type text check (fuel_type in ('gasoline', 'diesel', 'electric', 'hybrid')),
  add column odometer_km integer check (odometer_km >= 0),
  add column fleet_status text not null default 'active' check (
    fleet_status in ('active', 'maintenance', 'retired')
  ),
  add column insurance_expiry_date date,
  add column registration_expiry_date date;

comment on column public.vehicles.fleet_status is
  'The vehicle''s own operational lifecycle, owned by Module 9 (Fleet) -- distinct from is_active, which is Planning''s simple bookable/not-bookable toggle.';

create index vehicles_fleet_status_idx on public.vehicles (fleet_status);
