-- 0049_equipment_plans: Module 4 (Resource Planning & Scheduling Engine). A plan is model-level
-- demand ("40x PAR Can RGBW for event X") that gets refined through Draft->Planning->Ready->
-- Approved->Prepared->Loaded->Completed->Cancelled before any warehouse operation begins.
-- customer_reference/event_reference are additive-FK-later placeholders (same pattern as
-- warehouse_dispatch_records.destination_reference) for the CRM/Events modules that don't
-- exist yet. Status transition legality (Draft->Planning->Ready...) is enforced in the
-- Service Layer (4.2), not a DB-level transitions table -- unlike equipment_items.current_status,
-- these RPCs aren't the app's only writer of physically scarce state, so the heavier two-layer
-- treatment built for the equipment lifecycle state machine isn't mirrored here by default.

create table public.equipment_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  event_start_at timestamptz not null,
  event_end_at timestamptz not null,
  customer_reference text,
  event_reference text,
  status text not null default 'draft' check (
    status in ('draft', 'planning', 'ready', 'approved', 'prepared', 'loaded', 'completed', 'cancelled')
  ),
  primary_warehouse_id uuid references public.warehouses (id),
  notes text,
  approved_by uuid references public.profiles (id),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id),
  updated_by uuid references public.profiles (id),
  deleted_at timestamptz,
  deleted_by uuid references public.profiles (id),
  constraint equipment_plans_event_window check (event_end_at > event_start_at)
);

comment on table public.equipment_plans is
  'Plan header: model-level equipment demand for an event/job, refined through an explicit status workflow before any warehouse reservation/pick is created.';

create index equipment_plans_status_idx on public.equipment_plans (status);
create index equipment_plans_event_window_idx on public.equipment_plans (event_start_at, event_end_at);
create index equipment_plans_primary_warehouse_id_idx on public.equipment_plans (primary_warehouse_id);
create index equipment_plans_approved_by_idx on public.equipment_plans (approved_by);
create index equipment_plans_created_by_idx on public.equipment_plans (created_by);
create index equipment_plans_updated_by_idx on public.equipment_plans (updated_by);
create index equipment_plans_deleted_by_idx on public.equipment_plans (deleted_by);

create trigger set_equipment_plans_updated_at
  before update on public.equipment_plans
  for each row
  execute function public.set_updated_at();

create table public.equipment_plan_items (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.equipment_plans (id),
  model_id uuid not null references public.equipment_models (id),
  quantity_requested numeric(14, 2) not null check (quantity_requested > 0),
  warehouse_id uuid references public.warehouses (id),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id),
  updated_by uuid references public.profiles (id)
);

comment on table public.equipment_plan_items is
  'One demand line per model per plan (quantity, not specific serials -- specific equipment_items are assigned later, at Prepared, via equipment_plan_item_assignments). Even individually-tracked models are planned as a quantity first.';

create index equipment_plan_items_plan_id_idx on public.equipment_plan_items (plan_id);
create index equipment_plan_items_model_id_idx on public.equipment_plan_items (model_id);
create index equipment_plan_items_warehouse_id_idx on public.equipment_plan_items (warehouse_id);
create index equipment_plan_items_created_by_idx on public.equipment_plan_items (created_by);
create index equipment_plan_items_updated_by_idx on public.equipment_plan_items (updated_by);

create trigger set_equipment_plan_items_updated_at
  before update on public.equipment_plan_items
  for each row
  execute function public.set_updated_at();

alter table public.equipment_plans enable row level security;
alter table public.equipment_plan_items enable row level security;

create policy "equipment_plans_select_viewers"
  on public.equipment_plans for select
  to authenticated
  using (public.has_permission((select auth.uid()), 'planning.view'));

create policy "equipment_plans_insert_planners"
  on public.equipment_plans for insert
  to authenticated
  with check (
    public.has_permission((select auth.uid()), 'planning.manage')
    or public.has_permission((select auth.uid()), 'planning.create')
  );

-- Covers ordinary edits and every workflow transition (approve/prepare/load/complete/cancel);
-- the service layer enforces which specific transition each permission may perform, same
-- pattern as Warehouse's transfer approval (warehouse_transfers_update_requesters, 0031).
create policy "equipment_plans_update_planners"
  on public.equipment_plans for update
  to authenticated
  using (
    public.has_permission((select auth.uid()), 'planning.manage')
    or public.has_permission((select auth.uid()), 'planning.update')
    or public.has_permission((select auth.uid()), 'planning.approve')
    or public.has_permission((select auth.uid()), 'planning.prepare')
    or public.has_permission((select auth.uid()), 'planning.load')
    or public.has_permission((select auth.uid()), 'planning.complete')
    or public.has_permission((select auth.uid()), 'planning.cancel')
  )
  with check (
    public.has_permission((select auth.uid()), 'planning.manage')
    or public.has_permission((select auth.uid()), 'planning.update')
    or public.has_permission((select auth.uid()), 'planning.approve')
    or public.has_permission((select auth.uid()), 'planning.prepare')
    or public.has_permission((select auth.uid()), 'planning.load')
    or public.has_permission((select auth.uid()), 'planning.complete')
    or public.has_permission((select auth.uid()), 'planning.cancel')
  );

create policy "equipment_plan_items_select_viewers"
  on public.equipment_plan_items for select
  to authenticated
  using (public.has_permission((select auth.uid()), 'planning.view'));

create policy "equipment_plan_items_insert_planners"
  on public.equipment_plan_items for insert
  to authenticated
  with check (
    public.has_permission((select auth.uid()), 'planning.manage')
    or public.has_permission((select auth.uid()), 'planning.create')
    or public.has_permission((select auth.uid()), 'planning.update')
  );

create policy "equipment_plan_items_update_planners"
  on public.equipment_plan_items for update
  to authenticated
  using (
    public.has_permission((select auth.uid()), 'planning.manage')
    or public.has_permission((select auth.uid()), 'planning.update')
  )
  with check (
    public.has_permission((select auth.uid()), 'planning.manage')
    or public.has_permission((select auth.uid()), 'planning.update')
  );

-- Plan items are physically removable (not just status='cancelled' like warehouse_transfer_lines)
-- because they're pre-commitment demand lines a planner is still shaping, not a movement record.
create policy "equipment_plan_items_delete_planners"
  on public.equipment_plan_items for delete
  to authenticated
  using (
    public.has_permission((select auth.uid()), 'planning.manage')
    or public.has_permission((select auth.uid()), 'planning.update')
  );
