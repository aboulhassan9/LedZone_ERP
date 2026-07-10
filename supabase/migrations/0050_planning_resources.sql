-- 0050_planning_resources: crew/vehicle scheduling stubs plus the serial-level equipment
-- assignment table populated at the Prepared workflow stage. crew_members/vehicles are
-- deliberately thin -- placeholders for a future HR/Fleet module, not a preview of one.

create table public.crew_members (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  role text,
  phone text,
  email text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id),
  updated_by uuid references public.profiles (id),
  deleted_at timestamptz,
  deleted_by uuid references public.profiles (id)
);

comment on table public.crew_members is
  'Deliberately minimal crew directory -- just enough for resource_assignments to point at a real person. Expected to be replaced/absorbed by a future HR/Crew module.';

create index crew_members_created_by_idx on public.crew_members (created_by);
create index crew_members_updated_by_idx on public.crew_members (updated_by);
create index crew_members_deleted_by_idx on public.crew_members (deleted_by);

create trigger set_crew_members_updated_at
  before update on public.crew_members
  for each row
  execute function public.set_updated_at();

create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  plate_number text,
  vehicle_type text,
  capacity_notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id),
  updated_by uuid references public.profiles (id),
  deleted_at timestamptz,
  deleted_by uuid references public.profiles (id)
);

comment on table public.vehicles is
  'Deliberately minimal vehicle directory -- just enough for resource_assignments to point at a real vehicle. Expected to be replaced/absorbed by a future Fleet module.';

create index vehicles_created_by_idx on public.vehicles (created_by);
create index vehicles_updated_by_idx on public.vehicles (updated_by);
create index vehicles_deleted_by_idx on public.vehicles (deleted_by);

create trigger set_vehicles_updated_at
  before update on public.vehicles
  for each row
  execute function public.set_updated_at();

create table public.resource_assignments (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.equipment_plans (id),
  resource_type text not null check (resource_type in ('crew', 'vehicle')),
  crew_member_id uuid references public.crew_members (id),
  vehicle_id uuid references public.vehicles (id),
  role_or_purpose text,
  scheduled_start_at timestamptz not null,
  scheduled_end_at timestamptz not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id),
  updated_by uuid references public.profiles (id),
  constraint resource_assignments_window check (scheduled_end_at > scheduled_start_at),
  constraint resource_assignments_type_matches_ref check (
    (resource_type = 'crew' and crew_member_id is not null and vehicle_id is null)
    or (resource_type = 'vehicle' and vehicle_id is not null and crew_member_id is null)
  )
);

comment on table public.resource_assignments is
  'A crew or vehicle booking against a plan. Generic on purpose -- crew/vehicle scheduling conflict detection belongs to future HR/Fleet modules; this table only records "who/what, when, why".';

create index resource_assignments_plan_id_idx on public.resource_assignments (plan_id);
create index resource_assignments_crew_member_id_idx on public.resource_assignments (crew_member_id);
create index resource_assignments_vehicle_id_idx on public.resource_assignments (vehicle_id);
create index resource_assignments_window_idx on public.resource_assignments (scheduled_start_at, scheduled_end_at);
create index resource_assignments_created_by_idx on public.resource_assignments (created_by);
create index resource_assignments_updated_by_idx on public.resource_assignments (updated_by);

create trigger set_resource_assignments_updated_at
  before update on public.resource_assignments
  for each row
  execute function public.set_updated_at();

create table public.equipment_plan_item_assignments (
  id uuid primary key default gen_random_uuid(),
  plan_item_id uuid not null references public.equipment_plan_items (id),
  item_id uuid not null references public.equipment_items (id),
  warehouse_reservation_id uuid references public.warehouse_reservations (id),
  assigned_at timestamptz not null default now(),
  assigned_by uuid references public.profiles (id)
);

comment on table public.equipment_plan_item_assignments is
  'Which specific equipment_items serial was assigned to which plan_item, and the warehouse_reservations row (if any) that holds it. Populated only at the Prepared workflow stage -- empty for consumable-model plan items, which reserve by quantity, not by serial. The reservation itself is always created via the existing warehouse reservationService (create_warehouse_reservation RPC, 0047) -- this table never duplicates that logic, it only records the link.';

create index equipment_plan_item_assignments_plan_item_id_idx on public.equipment_plan_item_assignments (plan_item_id);
create index equipment_plan_item_assignments_item_id_idx on public.equipment_plan_item_assignments (item_id);
create index equipment_plan_item_assignments_warehouse_reservation_id_idx on public.equipment_plan_item_assignments (warehouse_reservation_id);
create index equipment_plan_item_assignments_assigned_by_idx on public.equipment_plan_item_assignments (assigned_by);

alter table public.crew_members enable row level security;
alter table public.vehicles enable row level security;
alter table public.resource_assignments enable row level security;
alter table public.equipment_plan_item_assignments enable row level security;

create policy "crew_members_select_viewers"
  on public.crew_members for select
  to authenticated
  using (public.has_permission((select auth.uid()), 'planning.view'));

create policy "crew_members_insert_managers"
  on public.crew_members for insert
  to authenticated
  with check (
    public.has_permission((select auth.uid()), 'planning.manage')
    or public.has_permission((select auth.uid()), 'planning.assign.crew')
  );

create policy "crew_members_update_managers"
  on public.crew_members for update
  to authenticated
  using (
    public.has_permission((select auth.uid()), 'planning.manage')
    or public.has_permission((select auth.uid()), 'planning.assign.crew')
  )
  with check (
    public.has_permission((select auth.uid()), 'planning.manage')
    or public.has_permission((select auth.uid()), 'planning.assign.crew')
  );

create policy "vehicles_select_viewers"
  on public.vehicles for select
  to authenticated
  using (public.has_permission((select auth.uid()), 'planning.view'));

create policy "vehicles_insert_managers"
  on public.vehicles for insert
  to authenticated
  with check (
    public.has_permission((select auth.uid()), 'planning.manage')
    or public.has_permission((select auth.uid()), 'planning.assign.vehicle')
  );

create policy "vehicles_update_managers"
  on public.vehicles for update
  to authenticated
  using (
    public.has_permission((select auth.uid()), 'planning.manage')
    or public.has_permission((select auth.uid()), 'planning.assign.vehicle')
  )
  with check (
    public.has_permission((select auth.uid()), 'planning.manage')
    or public.has_permission((select auth.uid()), 'planning.assign.vehicle')
  );

create policy "resource_assignments_select_viewers"
  on public.resource_assignments for select
  to authenticated
  using (public.has_permission((select auth.uid()), 'planning.view'));

create policy "resource_assignments_insert_assigners"
  on public.resource_assignments for insert
  to authenticated
  with check (
    public.has_permission((select auth.uid()), 'planning.manage')
    or (resource_type = 'crew' and public.has_permission((select auth.uid()), 'planning.assign.crew'))
    or (resource_type = 'vehicle' and public.has_permission((select auth.uid()), 'planning.assign.vehicle'))
  );

create policy "resource_assignments_update_assigners"
  on public.resource_assignments for update
  to authenticated
  using (
    public.has_permission((select auth.uid()), 'planning.manage')
    or (resource_type = 'crew' and public.has_permission((select auth.uid()), 'planning.assign.crew'))
    or (resource_type = 'vehicle' and public.has_permission((select auth.uid()), 'planning.assign.vehicle'))
  )
  with check (
    public.has_permission((select auth.uid()), 'planning.manage')
    or (resource_type = 'crew' and public.has_permission((select auth.uid()), 'planning.assign.crew'))
    or (resource_type = 'vehicle' and public.has_permission((select auth.uid()), 'planning.assign.vehicle'))
  );

create policy "resource_assignments_delete_assigners"
  on public.resource_assignments for delete
  to authenticated
  using (
    public.has_permission((select auth.uid()), 'planning.manage')
    or (resource_type = 'crew' and public.has_permission((select auth.uid()), 'planning.assign.crew'))
    or (resource_type = 'vehicle' and public.has_permission((select auth.uid()), 'planning.assign.vehicle'))
  );

create policy "equipment_plan_item_assignments_select_viewers"
  on public.equipment_plan_item_assignments for select
  to authenticated
  using (public.has_permission((select auth.uid()), 'planning.view'));

-- Written exclusively by the Prepared-stage transactional step (planning.prepare), which
-- runs after the existing warehouse reservationService has already created the underlying
-- warehouse_reservations row.
create policy "equipment_plan_item_assignments_insert_preparers"
  on public.equipment_plan_item_assignments for insert
  to authenticated
  with check (
    public.has_permission((select auth.uid()), 'planning.manage')
    or public.has_permission((select auth.uid()), 'planning.prepare')
  );

create policy "equipment_plan_item_assignments_delete_preparers"
  on public.equipment_plan_item_assignments for delete
  to authenticated
  using (
    public.has_permission((select auth.uid()), 'planning.manage')
    or public.has_permission((select auth.uid()), 'planning.prepare')
    or public.has_permission((select auth.uid()), 'planning.cancel')
  );
