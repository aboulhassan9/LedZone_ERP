-- 0055_planning_workflow_functions: the atomic write boundary for Module 4.2's PlanWorkflowService
-- and EquipmentPlanService. Every multi-table write in the plan lifecycle gets one
-- SECURITY DEFINER function -- a raised exception anywhere inside rolls back everything the
-- function already did, with no JS-level compensation needed. Callers (JS services) compute
-- *what* to write (eligible items, conflict/shortage lists, snapshot JSON) using
-- AvailabilityService/ConflictDetectionService as the sole source of truth; these functions only
-- perform the already-decided atomic write, re-validating gates under lock as a defensive
-- backstop against a stale JS-side read (the same "DB doesn't trust the caller alone" posture
-- as assert_equipment_status_transition itself).

create or replace function public.replace_equipment_plan_conflicts(
  p_plan_id uuid,
  p_conflicts jsonb default '[]'::jsonb,
  p_shortages jsonb default '[]'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not (
    public.has_permission(auth.uid(), 'planning.manage')
    or public.has_permission(auth.uid(), 'planning.create')
    or public.has_permission(auth.uid(), 'planning.update')
    or public.has_permission(auth.uid(), 'planning.approve')
    or public.has_permission(auth.uid(), 'planning.prepare')
  ) then
    raise exception 'Permission denied to update plan conflicts';
  end if;

  if not exists (select 1 from public.equipment_plans where id = p_plan_id) then
    raise exception 'Equipment plan % not found', p_plan_id;
  end if;

  delete from public.equipment_conflicts where plan_id = p_plan_id and resolved_at is null;
  delete from public.equipment_shortages where plan_id = p_plan_id and resolved_at is null;

  insert into public.equipment_conflicts (
    plan_id, plan_item_id, conflict_type, severity, conflicting_plan_id, description
  )
  select
    p_plan_id,
    (c->>'plan_item_id')::uuid,
    c->>'conflict_type',
    c->>'severity',
    (c->>'conflicting_plan_id')::uuid,
    c->>'description'
  from jsonb_array_elements(p_conflicts) as c;

  insert into public.equipment_shortages (plan_id, plan_item_id, quantity_short)
  select
    p_plan_id,
    (s->>'plan_item_id')::uuid,
    (s->>'quantity_short')::numeric
  from jsonb_array_elements(p_shortages) as s;
end;
$$;

comment on function public.replace_equipment_plan_conflicts is
  'Full recompute, not incremental: deletes every unresolved conflict/shortage for the plan and inserts the fresh set computed by ConflictDetectionService, atomically. ConflictDetectionService itself never writes -- this is the only write path for these two tables.';

create or replace function public.prepare_equipment_plan(
  p_plan_id uuid,
  p_assignments jsonb default '[]'::jsonb,
  p_snapshot_json jsonb default '{}'::jsonb,
  p_change_summary text default null
)
returns public.equipment_plans
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan public.equipment_plans;
  v_assignment record;
  v_reservation public.warehouse_reservations;
  v_version_number integer;
begin
  if not (
    public.has_permission(auth.uid(), 'planning.manage')
    or public.has_permission(auth.uid(), 'planning.prepare')
  ) then
    raise exception 'Permission denied to prepare equipment plan';
  end if;

  select * into v_plan from public.equipment_plans where id = p_plan_id for update;
  if not found then
    raise exception 'Equipment plan % not found', p_plan_id;
  end if;
  if v_plan.status <> 'approved' then
    raise exception 'Plan % is "%", not approved -- cannot prepare it', p_plan_id, v_plan.status;
  end if;
  if exists (select 1 from public.equipment_shortages where plan_id = p_plan_id and resolved_at is null) then
    raise exception 'Plan % has unresolved shortages -- cannot prepare it', p_plan_id;
  end if;

  for v_assignment in
    select * from jsonb_to_recordset(p_assignments) as x(plan_item_id uuid, item_id uuid)
  loop
    if not exists (
      select 1 from public.equipment_plan_items where id = v_assignment.plan_item_id and plan_id = p_plan_id
    ) then
      raise exception 'Plan item % does not belong to plan %', v_assignment.plan_item_id, p_plan_id;
    end if;

    select public.create_warehouse_reservation(
      null, v_assignment.item_id, 'event', v_plan.event_end_at,
      'Plan: ' || v_plan.name
    ) into v_reservation;

    perform public.reserve_equipment_item(v_assignment.item_id);

    insert into public.equipment_plan_item_assignments (
      plan_item_id, item_id, warehouse_reservation_id, assigned_by
    ) values (
      v_assignment.plan_item_id, v_assignment.item_id, v_reservation.id, auth.uid()
    );
  end loop;

  update public.equipment_plans set status = 'prepared', updated_by = auth.uid()
  where id = p_plan_id
  returning * into v_plan;

  select coalesce(max(version_number), 0) + 1 into v_version_number
  from public.equipment_plan_versions where plan_id = p_plan_id;

  insert into public.equipment_plan_versions (
    plan_id, version_number, status_at_version, snapshot_json, change_summary, created_by
  ) values (
    p_plan_id, v_version_number, 'prepared', p_snapshot_json, p_change_summary, auth.uid()
  );

  return v_plan;
end;
$$;

comment on function public.prepare_equipment_plan is
  'Approved -> Prepared, atomically. p_assignments is the {plan_item_id, item_id} list already decided by AvailabilityService.selectEligibleItems() in JS -- this function does not re-derive eligibility, it only performs the write, relying on create_warehouse_reservation''s own unique-index atomicity as the final concurrency guard. Any failure (including a lost reservation race) rolls back every reservation/assignment already made in this call.';

create or replace function public.approve_equipment_plan(
  p_plan_id uuid,
  p_snapshot_json jsonb default '{}'::jsonb,
  p_change_summary text default null
)
returns public.equipment_plans
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan public.equipment_plans;
  v_version_number integer;
begin
  if not (
    public.has_permission(auth.uid(), 'planning.manage')
    or public.has_permission(auth.uid(), 'planning.approve')
  ) then
    raise exception 'Permission denied to approve equipment plan';
  end if;

  select * into v_plan from public.equipment_plans where id = p_plan_id for update;
  if not found then
    raise exception 'Equipment plan % not found', p_plan_id;
  end if;
  if v_plan.status <> 'ready' then
    raise exception 'Plan % is "%", not ready -- cannot approve it', p_plan_id, v_plan.status;
  end if;
  if exists (
    select 1 from public.equipment_conflicts
    where plan_id = p_plan_id and resolved_at is null and severity = 'blocking'
  ) then
    raise exception 'Plan % has unresolved blocking conflicts -- cannot approve it', p_plan_id;
  end if;

  update public.equipment_plans
  set status = 'approved', approved_by = auth.uid(), approved_at = now(), updated_by = auth.uid()
  where id = p_plan_id
  returning * into v_plan;

  select coalesce(max(version_number), 0) + 1 into v_version_number
  from public.equipment_plan_versions where plan_id = p_plan_id;

  insert into public.equipment_plan_versions (
    plan_id, version_number, status_at_version, snapshot_json, change_summary, created_by
  ) values (
    p_plan_id, v_version_number, 'approved', p_snapshot_json, p_change_summary, auth.uid()
  );

  return v_plan;
end;
$$;

comment on function public.approve_equipment_plan is
  'Ready -> Approved, atomically, gated on zero unresolved blocking conflicts (re-checked under lock, not trusting the JS-side pre-check alone).';

create or replace function public.load_equipment_plan(
  p_plan_id uuid,
  p_snapshot_json jsonb default '{}'::jsonb,
  p_change_summary text default null
)
returns public.equipment_plans
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan public.equipment_plans;
  v_assignment record;
  v_version_number integer;
begin
  if not (
    public.has_permission(auth.uid(), 'planning.manage')
    or public.has_permission(auth.uid(), 'planning.load')
  ) then
    raise exception 'Permission denied to load equipment plan';
  end if;

  select * into v_plan from public.equipment_plans where id = p_plan_id for update;
  if not found then
    raise exception 'Equipment plan % not found', p_plan_id;
  end if;
  if v_plan.status <> 'prepared' then
    raise exception 'Plan % is "%", not prepared -- cannot load it', p_plan_id, v_plan.status;
  end if;

  for v_assignment in
    select a.id as assignment_id, a.warehouse_reservation_id, i.current_status, i.asset_tag
    from public.equipment_plan_item_assignments a
    join public.equipment_plan_items pi on pi.id = a.plan_item_id
    join public.equipment_items i on i.id = a.item_id
    where pi.plan_id = p_plan_id
  loop
    if v_assignment.current_status <> 'in_transit' then
      raise exception 'Item % is "%", not in_transit yet -- dispatch it through Warehouse before loading this plan',
        v_assignment.asset_tag, v_assignment.current_status;
    end if;

    if v_assignment.warehouse_reservation_id is not null then
      update public.warehouse_reservations
      set released_at = now()
      where id = v_assignment.warehouse_reservation_id and released_at is null;
    end if;
  end loop;

  update public.equipment_plans set status = 'loaded', updated_by = auth.uid()
  where id = p_plan_id
  returning * into v_plan;

  select coalesce(max(version_number), 0) + 1 into v_version_number
  from public.equipment_plan_versions where plan_id = p_plan_id;

  insert into public.equipment_plan_versions (
    plan_id, version_number, status_at_version, snapshot_json, change_summary, created_by
  ) values (
    p_plan_id, v_version_number, 'loaded', p_snapshot_json, p_change_summary, auth.uid()
  );

  return v_plan;
end;
$$;

comment on function public.load_equipment_plan is
  'Prepared -> Loaded. A gate, not a driver: requires every assigned item to already be in_transit (reached via Warehouse''s own existing pick/dispatch screens, untouched by this function) before releasing each item''s reservation.';

create or replace function public.complete_equipment_plan(
  p_plan_id uuid,
  p_snapshot_json jsonb default '{}'::jsonb,
  p_change_summary text default null
)
returns public.equipment_plans
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan public.equipment_plans;
  v_assignment record;
  v_version_number integer;
begin
  if not (
    public.has_permission(auth.uid(), 'planning.manage')
    or public.has_permission(auth.uid(), 'planning.complete')
  ) then
    raise exception 'Permission denied to complete equipment plan';
  end if;

  select * into v_plan from public.equipment_plans where id = p_plan_id for update;
  if not found then
    raise exception 'Equipment plan % not found', p_plan_id;
  end if;
  if v_plan.status <> 'loaded' then
    raise exception 'Plan % is "%", not loaded -- cannot complete it', p_plan_id, v_plan.status;
  end if;

  for v_assignment in
    select a.item_id, i.current_status, i.asset_tag
    from public.equipment_plan_item_assignments a
    join public.equipment_plan_items pi on pi.id = a.plan_item_id
    join public.equipment_items i on i.id = a.item_id
    where pi.plan_id = p_plan_id
  loop
    if v_assignment.current_status in ('in_transit', 'on_site') then
      perform public.return_equipment_item(v_assignment.item_id);
    elsif v_assignment.current_status = 'returned' then
      continue;
    else
      raise exception 'Item % is "%" -- cannot complete this plan until it is resolved (expected in_transit, on_site, or returned)',
        v_assignment.asset_tag, v_assignment.current_status;
    end if;
  end loop;

  update public.equipment_plans set status = 'completed', updated_by = auth.uid()
  where id = p_plan_id
  returning * into v_plan;

  select coalesce(max(version_number), 0) + 1 into v_version_number
  from public.equipment_plan_versions where plan_id = p_plan_id;

  insert into public.equipment_plan_versions (
    plan_id, version_number, status_at_version, snapshot_json, change_summary, created_by
  ) values (
    p_plan_id, v_version_number, 'completed', p_snapshot_json, p_change_summary, auth.uid()
  );

  return v_plan;
end;
$$;

comment on function public.complete_equipment_plan is
  'Loaded -> Completed. Strict, not lenient: every assigned item must be in_transit/on_site (moved to returned here) or already returned -- anything else (scrapped, lost, still reserved/picked) aborts the whole transition naming the offending item, rather than silently completing over a real problem.';

create or replace function public.cancel_equipment_plan(
  p_plan_id uuid,
  p_snapshot_json jsonb default '{}'::jsonb,
  p_change_summary text default null
)
returns public.equipment_plans
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan public.equipment_plans;
  v_assignment record;
  v_version_number integer;
begin
  if not (
    public.has_permission(auth.uid(), 'planning.manage')
    or public.has_permission(auth.uid(), 'planning.cancel')
  ) then
    raise exception 'Permission denied to cancel equipment plan';
  end if;

  select * into v_plan from public.equipment_plans where id = p_plan_id for update;
  if not found then
    raise exception 'Equipment plan % not found', p_plan_id;
  end if;
  if v_plan.status in ('loaded', 'completed', 'cancelled') then
    raise exception 'Plan % is already "%" -- cannot cancel it', p_plan_id, v_plan.status;
  end if;

  for v_assignment in
    select a.item_id, a.warehouse_reservation_id, i.current_status
    from public.equipment_plan_item_assignments a
    join public.equipment_plan_items pi on pi.id = a.plan_item_id
    join public.equipment_items i on i.id = a.item_id
    where pi.plan_id = p_plan_id
  loop
    -- Defensive, not blind: only revert an item still sitting in 'reserved'. One that has
    -- already moved on (picked/in_transit via Warehouse's own floor operations, a race with
    -- this cancel) is left alone -- forcing it backward would contradict physical reality.
    if v_assignment.current_status = 'reserved' then
      perform public.release_equipment_item_reservation(v_assignment.item_id);
    end if;

    if v_assignment.warehouse_reservation_id is not null then
      update public.warehouse_reservations
      set released_at = now()
      where id = v_assignment.warehouse_reservation_id and released_at is null;
    end if;
  end loop;

  update public.equipment_conflicts
  set resolved_at = now(), resolved_by = auth.uid()
  where plan_id = p_plan_id and resolved_at is null;

  update public.equipment_shortages
  set resolved_at = now()
  where plan_id = p_plan_id and resolved_at is null;

  update public.equipment_plans set status = 'cancelled', updated_by = auth.uid()
  where id = p_plan_id
  returning * into v_plan;

  select coalesce(max(version_number), 0) + 1 into v_version_number
  from public.equipment_plan_versions where plan_id = p_plan_id;

  insert into public.equipment_plan_versions (
    plan_id, version_number, status_at_version, snapshot_json, change_summary, created_by
  ) values (
    p_plan_id, v_version_number, 'cancelled', p_snapshot_json, p_change_summary, auth.uid()
  );

  return v_plan;
end;
$$;

comment on function public.cancel_equipment_plan is
  'From any pre-Loaded status -> Cancelled. Releases every assignment''s reservation (best-effort on the DB row even for an item that has already moved past reserved) and marks all unresolved conflicts/shortages resolved. p_change_summary carries the cancellation reason -- there is no dedicated column on equipment_plans for it.';
