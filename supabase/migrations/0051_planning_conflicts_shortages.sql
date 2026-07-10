-- 0051_planning_conflicts_shortages: written by the planning ConflictDetectionService, not
-- hand-entered. equipment_shortages is a separate table from equipment_conflicts (rather than
-- a "quantity_shortage" conflict_type) because a shortage carries a quantity_short number that
-- a generic conflict row has no use for elsewhere, and drives a different UI affordance.

create table public.equipment_conflicts (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.equipment_plans (id),
  plan_item_id uuid references public.equipment_plan_items (id),
  conflict_type text not null check (
    conflict_type in ('double_booking', 'warehouse_mismatch', 'maintenance_conflict', 'status_unavailable')
  ),
  severity text not null check (severity in ('blocking', 'warning')),
  conflicting_plan_id uuid references public.equipment_plans (id),
  description text not null,
  detected_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references public.profiles (id)
);

comment on table public.equipment_conflicts is
  'Re-evaluated (not incrementally maintained) by ConflictDetectionService on every plan-item change and status-transition attempt. quantity_shortage is intentionally not a conflict_type here -- see equipment_shortages.';

create index equipment_conflicts_plan_id_idx on public.equipment_conflicts (plan_id);
create index equipment_conflicts_plan_item_id_idx on public.equipment_conflicts (plan_item_id);
create index equipment_conflicts_conflicting_plan_id_idx on public.equipment_conflicts (conflicting_plan_id);
create index equipment_conflicts_resolved_by_idx on public.equipment_conflicts (resolved_by);
create index equipment_conflicts_unresolved_idx on public.equipment_conflicts (plan_id) where resolved_at is null;

create table public.equipment_shortages (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.equipment_plans (id),
  plan_item_id uuid not null references public.equipment_plan_items (id),
  quantity_short numeric(14, 2) not null check (quantity_short > 0),
  detected_at timestamptz not null default now(),
  resolved_at timestamptz
);

comment on table public.equipment_shortages is
  'Quantity gap for a plan item: available_quantity < quantity_requested with no single colliding plan to blame. Re-evaluated the same way as equipment_conflicts.';

create index equipment_shortages_plan_id_idx on public.equipment_shortages (plan_id);
create index equipment_shortages_plan_item_id_idx on public.equipment_shortages (plan_item_id);
create index equipment_shortages_unresolved_idx on public.equipment_shortages (plan_id) where resolved_at is null;

alter table public.equipment_conflicts enable row level security;
alter table public.equipment_shortages enable row level security;

create policy "equipment_conflicts_select_viewers"
  on public.equipment_conflicts for select
  to authenticated
  using (public.has_permission((select auth.uid()), 'planning.view'));

-- Written by ConflictDetectionService as a side effect of ordinary plan editing/transition
-- attempts -- gated the same as editing the plan itself, not a separate permission.
create policy "equipment_conflicts_insert_planners"
  on public.equipment_conflicts for insert
  to authenticated
  with check (
    public.has_permission((select auth.uid()), 'planning.manage')
    or public.has_permission((select auth.uid()), 'planning.create')
    or public.has_permission((select auth.uid()), 'planning.update')
    or public.has_permission((select auth.uid()), 'planning.approve')
    or public.has_permission((select auth.uid()), 'planning.prepare')
  );

create policy "equipment_conflicts_update_planners"
  on public.equipment_conflicts for update
  to authenticated
  using (
    public.has_permission((select auth.uid()), 'planning.manage')
    or public.has_permission((select auth.uid()), 'planning.update')
  )
  with check (
    public.has_permission((select auth.uid()), 'planning.manage')
    or public.has_permission((select auth.uid()), 'planning.update')
  );

create policy "equipment_shortages_select_viewers"
  on public.equipment_shortages for select
  to authenticated
  using (public.has_permission((select auth.uid()), 'planning.view'));

create policy "equipment_shortages_insert_planners"
  on public.equipment_shortages for insert
  to authenticated
  with check (
    public.has_permission((select auth.uid()), 'planning.manage')
    or public.has_permission((select auth.uid()), 'planning.create')
    or public.has_permission((select auth.uid()), 'planning.update')
    or public.has_permission((select auth.uid()), 'planning.approve')
    or public.has_permission((select auth.uid()), 'planning.prepare')
  );

create policy "equipment_shortages_update_planners"
  on public.equipment_shortages for update
  to authenticated
  using (
    public.has_permission((select auth.uid()), 'planning.manage')
    or public.has_permission((select auth.uid()), 'planning.update')
  )
  with check (
    public.has_permission((select auth.uid()), 'planning.manage')
    or public.has_permission((select auth.uid()), 'planning.update')
  );
