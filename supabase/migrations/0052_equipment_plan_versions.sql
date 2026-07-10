-- 0052_equipment_plan_versions: an immutable snapshot written at every status transition (plus
-- on-demand "save version"), merging the two tables the original spec suggested
-- (planning_snapshots + planning_versions) into one -- a version *is* a snapshot here.

create table public.equipment_plan_versions (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.equipment_plans (id),
  version_number integer not null check (version_number > 0),
  status_at_version text not null,
  snapshot_json jsonb not null default '{}'::jsonb,
  change_summary text,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles (id),
  constraint equipment_plan_versions_plan_version_uq unique (plan_id, version_number)
);

comment on table public.equipment_plan_versions is
  'Append-only. snapshot_json carries the full plan_items + assignments + conflicts state at the moment of the version. Written automatically on every workflow transition and on demand.';

create index equipment_plan_versions_plan_id_idx on public.equipment_plan_versions (plan_id);
create index equipment_plan_versions_created_by_idx on public.equipment_plan_versions (created_by);

alter table public.equipment_plan_versions enable row level security;

create policy "equipment_plan_versions_select_viewers"
  on public.equipment_plan_versions for select
  to authenticated
  using (public.has_permission((select auth.uid()), 'planning.view'));

create policy "equipment_plan_versions_insert_planners"
  on public.equipment_plan_versions for insert
  to authenticated
  with check (
    public.has_permission((select auth.uid()), 'planning.manage')
    or public.has_permission((select auth.uid()), 'planning.create')
    or public.has_permission((select auth.uid()), 'planning.update')
    or public.has_permission((select auth.uid()), 'planning.approve')
    or public.has_permission((select auth.uid()), 'planning.prepare')
    or public.has_permission((select auth.uid()), 'planning.load')
    or public.has_permission((select auth.uid()), 'planning.complete')
    or public.has_permission((select auth.uid()), 'planning.cancel')
  );
