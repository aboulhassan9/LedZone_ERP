-- 0054_planning_lifecycle_functions: three new, additive equipment-lifecycle RPCs for Module
-- 4.2 (Resource Planning & Scheduling Engine). Closes two edges already legal in
-- equipment_status_transitions (0045) but never reached by any existing caller: available ->
-- reserved (Prepare) and in_transit/on_site -> returned (Complete), plus the reverse of the
-- first (Cancel). No existing function is modified. Each is status-only -- no location change
-- -- so a same-location movement row is written, mirroring how 'transfer' already logs a
-- no-op location move elsewhere.

alter table public.equipment_item_movements
  drop constraint equipment_item_movements_movement_type_check;

alter table public.equipment_item_movements
  add constraint equipment_item_movements_movement_type_check check (
    movement_type in (
      'initial_placement', 'transfer', 'check_out', 'check_in',
      'receive', 'put_away', 'pick', 'dispatch', 'return', 'repair_transfer',
      'quarantine', 'release', 'scrap', 'cycle_count_adjustment', 'bulk_move', 'reserve'
    )
  );

create or replace function public.reserve_equipment_item(p_item_id uuid)
returns public.equipment_item_movements
language plpgsql
security definer
set search_path = public
as $$
declare
  v_location uuid;
  v_movement public.equipment_item_movements;
begin
  if not (
    public.has_permission(auth.uid(), 'planning.manage')
    or public.has_permission(auth.uid(), 'planning.prepare')
  ) then
    raise exception 'Permission denied to reserve equipment item';
  end if;

  select current_storage_location_id into v_location
  from public.equipment_items where id = p_item_id;
  if not found then
    raise exception 'Equipment item % not found', p_item_id;
  end if;
  if v_location is null then
    raise exception 'Equipment item % has no current location, cannot reserve', p_item_id;
  end if;

  perform public.assert_equipment_status_transition(p_item_id, 'reserved');

  insert into public.equipment_item_movements (
    item_id, from_storage_location_id, to_storage_location_id, movement_type, moved_by, reference_note
  ) values (
    p_item_id, v_location, v_location, 'reserve', auth.uid(), 'Planning: item reserved for a plan'
  )
  returning * into v_movement;

  update public.equipment_items
  set current_status = 'reserved', updated_by = auth.uid()
  where id = p_item_id;

  return v_movement;
end;
$$;

comment on function public.reserve_equipment_item is
  'Module 4 (Planning) Prepare stage: available -> reserved, no location change. SECURITY DEFINER so a planning.prepare holder (without inventory.manage) can update equipment_items despite its blanket UPDATE policy.';

create or replace function public.release_equipment_item_reservation(p_item_id uuid)
returns public.equipment_item_movements
language plpgsql
security definer
set search_path = public
as $$
declare
  v_location uuid;
  v_movement public.equipment_item_movements;
begin
  if not (
    public.has_permission(auth.uid(), 'planning.manage')
    or public.has_permission(auth.uid(), 'planning.cancel')
  ) then
    raise exception 'Permission denied to release equipment item reservation';
  end if;

  select current_storage_location_id into v_location
  from public.equipment_items where id = p_item_id;
  if not found then
    raise exception 'Equipment item % not found', p_item_id;
  end if;

  perform public.assert_equipment_status_transition(p_item_id, 'available');

  insert into public.equipment_item_movements (
    item_id, from_storage_location_id, to_storage_location_id, movement_type, moved_by, reference_note
  ) values (
    p_item_id, v_location, v_location, 'reserve', auth.uid(), 'Planning: reservation released (plan cancelled)'
  )
  returning * into v_movement;

  update public.equipment_items
  set current_status = 'available', updated_by = auth.uid()
  where id = p_item_id;

  return v_movement;
end;
$$;

comment on function public.release_equipment_item_reservation is
  'Module 4 (Planning) Cancel stage: reserved -> available, the reverse of reserve_equipment_item. Only ever called for an item still in reserved status -- PlanWorkflowService checks this before calling, and assert_equipment_status_transition rejects it otherwise regardless.';

create or replace function public.return_equipment_item(p_item_id uuid)
returns public.equipment_item_movements
language plpgsql
security definer
set search_path = public
as $$
declare
  v_location uuid;
  v_movement public.equipment_item_movements;
begin
  if not (
    public.has_permission(auth.uid(), 'planning.manage')
    or public.has_permission(auth.uid(), 'planning.complete')
  ) then
    raise exception 'Permission denied to return equipment item';
  end if;

  select current_storage_location_id into v_location
  from public.equipment_items where id = p_item_id;
  if not found then
    raise exception 'Equipment item % not found', p_item_id;
  end if;

  perform public.assert_equipment_status_transition(p_item_id, 'returned');

  insert into public.equipment_item_movements (
    item_id, from_storage_location_id, to_storage_location_id, movement_type, moved_by, reference_note
  ) values (
    p_item_id, v_location, v_location, 'return', auth.uid(), 'Planning: item returned at plan completion'
  )
  returning * into v_movement;

  update public.equipment_items
  set current_status = 'returned', updated_by = auth.uid()
  where id = p_item_id;

  return v_movement;
end;
$$;

comment on function public.return_equipment_item is
  'Module 4 (Planning) Complete stage: in_transit/on_site -> returned, no location change (the physical return-to-bin move is a separate, not-yet-built receiving/inspection flow -- this only marks the item back in LED Zone''s possession). SECURITY DEFINER for the same reason as reserve_equipment_item.';
