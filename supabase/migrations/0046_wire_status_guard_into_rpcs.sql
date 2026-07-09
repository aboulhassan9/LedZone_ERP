-- 0046_wire_status_guard_into_rpcs: wires assert_equipment_status_transition() (0045)
-- into every existing RPC that writes equipment_items.current_status, and into the two
-- that only move location (so a scrapped item can never be moved or re-dispatched
-- either, per "no operation on a scrapped asset"). Each function keeps its existing
-- signature and permission checks unchanged — only the added guard call and, where
-- noted, a retargeted status value.

-- 1. record_equipment_item_movement (0026): check_out -> in_use, check_in -> available
-- unchanged in meaning; now guarded. 'transfer' doesn't change status, so it re-asserts
-- the current status as a no-op purely to enforce the "not scrapped" rule.
create or replace function public.record_equipment_item_movement(
  p_item_id uuid,
  p_to_storage_location_id uuid,
  p_movement_type text,
  p_reference_note text default null
)
returns public.equipment_item_movements
language plpgsql
security definer
set search_path = public
as $$
declare
  v_from_location uuid;
  v_movement public.equipment_item_movements;
  v_new_status text;
  v_current_status text;
begin
  if p_movement_type not in ('transfer', 'check_out', 'check_in') then
    raise exception 'record_equipment_item_movement only supports transfer/check_out/check_in (got %)', p_movement_type;
  end if;

  if not (
    public.has_permission(auth.uid(), 'inventory.manage')
    or (p_movement_type = 'transfer' and public.has_permission(auth.uid(), 'inventory.transfer'))
    or (p_movement_type = 'check_out' and public.has_permission(auth.uid(), 'inventory.checkout'))
    or (p_movement_type = 'check_in' and public.has_permission(auth.uid(), 'inventory.checkin'))
  ) then
    raise exception 'Permission denied for movement type %', p_movement_type;
  end if;

  select current_storage_location_id, current_status into v_from_location, v_current_status
  from public.equipment_items where id = p_item_id;

  if not found then
    raise exception 'Equipment item % not found', p_item_id;
  end if;

  v_new_status := case p_movement_type
    when 'check_out' then 'in_use'
    when 'check_in' then 'available'
    else v_current_status
  end;

  perform public.assert_equipment_status_transition(p_item_id, v_new_status);

  insert into public.equipment_item_movements (
    item_id, from_storage_location_id, to_storage_location_id, movement_type, reference_note, moved_by
  ) values (
    p_item_id, v_from_location, p_to_storage_location_id, p_movement_type, p_reference_note, auth.uid()
  )
  returning * into v_movement;

  update public.equipment_items
  set current_storage_location_id = p_to_storage_location_id,
      current_status = v_new_status,
      updated_by = auth.uid()
  where id = p_item_id;

  return v_movement;
end;
$$;

comment on function public.record_equipment_item_movement is
  'Records a transfer/check_out/check_in movement and updates the item''s location (and status, for check_out/check_in) atomically, after validating the status transition via assert_equipment_status_transition(). SECURITY DEFINER so a checkout/checkin/transfer-only permission holder can update equipment_items despite its blanket UPDATE policy requiring inventory.manage.';

-- 2. create_damage_report (0026): now targets 'quarantined' instead of 'damaged' —
-- 'damaged' remains a current_condition value only (see 0045).
create or replace function public.create_damage_report(
  p_item_id uuid,
  p_description text,
  p_severity text,
  p_repair_cost numeric default null,
  p_currency_code text default null
)
returns public.equipment_damage_reports
language plpgsql
security definer
set search_path = public
as $$
declare
  v_report public.equipment_damage_reports;
begin
  if not (
    public.has_permission(auth.uid(), 'inventory.manage')
    or public.has_permission(auth.uid(), 'inventory.maintenance.manage')
  ) then
    raise exception 'Permission denied';
  end if;

  if not exists (select 1 from public.equipment_items where id = p_item_id) then
    raise exception 'Equipment item % not found', p_item_id;
  end if;

  perform public.assert_equipment_status_transition(p_item_id, 'quarantined');

  insert into public.equipment_damage_reports (
    item_id, reported_by, description, severity, repair_cost, currency_code, created_by, updated_by
  ) values (
    p_item_id, auth.uid(), p_description, p_severity, p_repair_cost, p_currency_code, auth.uid(), auth.uid()
  )
  returning * into v_report;

  update public.equipment_items
  set current_status = 'quarantined', updated_by = auth.uid()
  where id = p_item_id;

  return v_report;
end;
$$;

comment on function public.create_damage_report is
  'Logs a damage report and moves the item to quarantined status atomically, after validating the transition. SECURITY DEFINER so an inventory.maintenance.manage holder (without inventory.manage) can still trigger the status change.';

-- 3. create_lost_report (0026): unchanged target ('lost'), now guarded.
create or replace function public.create_lost_report(
  p_item_id uuid,
  p_description text default null,
  p_last_known_location_id uuid default null
)
returns public.equipment_lost_reports
language plpgsql
security definer
set search_path = public
as $$
declare
  v_report public.equipment_lost_reports;
begin
  if not (
    public.has_permission(auth.uid(), 'inventory.manage')
    or public.has_permission(auth.uid(), 'inventory.maintenance.manage')
  ) then
    raise exception 'Permission denied';
  end if;

  if not exists (select 1 from public.equipment_items where id = p_item_id) then
    raise exception 'Equipment item % not found', p_item_id;
  end if;

  perform public.assert_equipment_status_transition(p_item_id, 'lost');

  insert into public.equipment_lost_reports (
    item_id, reported_by, description, last_known_location_id, created_by, updated_by
  ) values (
    p_item_id, auth.uid(), p_description, p_last_known_location_id, auth.uid(), auth.uid()
  )
  returning * into v_report;

  update public.equipment_items
  set current_status = 'lost', updated_by = auth.uid()
  where id = p_item_id;

  return v_report;
end;
$$;

comment on function public.create_lost_report is
  'Logs a lost report and moves the item to lost status atomically, after validating the transition. SECURITY DEFINER for the same reason as create_damage_report.';

-- 4. create_maintenance_record (0026): only guarded/status-changing when
-- p_mark_item_available is true (available is the only status this function ever sets).
create or replace function public.create_maintenance_record(
  p_item_id uuid,
  p_maintenance_type text,
  p_schedule_id uuid default null,
  p_damage_report_id uuid default null,
  p_description text default null,
  p_cost numeric default null,
  p_currency_code text default null,
  p_technician_name text default null,
  p_next_recommended_date date default null,
  p_mark_item_available boolean default false
)
returns public.equipment_maintenance_records
language plpgsql
security definer
set search_path = public
as $$
declare
  v_record public.equipment_maintenance_records;
  v_interval_days integer;
begin
  if not (
    public.has_permission(auth.uid(), 'inventory.manage')
    or public.has_permission(auth.uid(), 'inventory.maintenance.manage')
  ) then
    raise exception 'Permission denied';
  end if;

  if not exists (select 1 from public.equipment_items where id = p_item_id) then
    raise exception 'Equipment item % not found', p_item_id;
  end if;

  if p_mark_item_available then
    perform public.assert_equipment_status_transition(p_item_id, 'available');
  end if;

  insert into public.equipment_maintenance_records (
    item_id, schedule_id, damage_report_id, performed_by, technician_name,
    maintenance_type, description, cost, currency_code, next_recommended_date,
    created_by, updated_by
  ) values (
    p_item_id, p_schedule_id, p_damage_report_id, auth.uid(), p_technician_name,
    p_maintenance_type, p_description, p_cost, p_currency_code, p_next_recommended_date,
    auth.uid(), auth.uid()
  )
  returning * into v_record;

  if p_schedule_id is not null then
    select interval_days into v_interval_days
    from public.equipment_maintenance_schedules where id = p_schedule_id;

    if found then
      update public.equipment_maintenance_schedules
      set last_performed_date = v_record.performed_date,
          next_due_date = v_record.performed_date + (v_interval_days || ' days')::interval,
          updated_by = auth.uid()
      where id = p_schedule_id;
    end if;
  end if;

  if p_mark_item_available then
    update public.equipment_items
    set current_status = 'available', updated_by = auth.uid()
    where id = p_item_id;
  end if;

  return v_record;
end;
$$;

comment on function public.create_maintenance_record is
  'Logs a maintenance record, rolls the linked schedule''s due date forward if any, and optionally returns the item to available status (validated) -- all atomically. SECURITY DEFINER for the same reason as create_damage_report.';

-- 5. record_warehouse_item_movement (0040): covers put_away/pick/quarantine/release/scrap.
-- The target status is supplied by the caller (p_new_status) rather than hardcoded here,
-- so the guard just validates whatever was requested; JS-side callers are updated in the
-- same review to pass the correct new-vocabulary target (picked/quarantined/in_maintenance/
-- scrapped).
create or replace function public.record_warehouse_item_movement(
  p_item_id uuid,
  p_to_warehouse_location_id uuid,
  p_movement_type text,
  p_reason text default null,
  p_new_status text default null
)
returns public.equipment_item_movements
language plpgsql
security definer
set search_path = public
as $$
declare
  v_from_storage uuid;
  v_to_storage uuid;
  v_movement public.equipment_item_movements;
begin
  if p_movement_type not in ('put_away', 'pick', 'quarantine', 'release', 'scrap') then
    raise exception 'record_warehouse_item_movement only supports put_away/pick/quarantine/release/scrap (got %)', p_movement_type;
  end if;

  if not (
    public.has_permission(auth.uid(), 'warehouse.manage')
    or (p_movement_type in ('put_away', 'pick') and public.has_permission(auth.uid(), 'warehouse.pick'))
    or (p_movement_type in ('quarantine', 'release') and public.has_permission(auth.uid(), 'warehouse.location.manage'))
  ) then
    raise exception 'Permission denied for movement type %', p_movement_type;
  end if;

  v_to_storage := public.resolve_storage_location_for_warehouse_location(p_to_warehouse_location_id);

  select current_storage_location_id into v_from_storage
  from public.equipment_items where id = p_item_id;
  if not found then
    raise exception 'Equipment item % not found', p_item_id;
  end if;

  if p_new_status is not null then
    perform public.assert_equipment_status_transition(p_item_id, p_new_status);
  else
    -- No status change requested (e.g. a bare "pick" with no destination status) — still
    -- enforce the "not scrapped" rule via a same-status no-op check.
    perform public.assert_equipment_status_transition(
      p_item_id, (select current_status from public.equipment_items where id = p_item_id)
    );
  end if;

  insert into public.equipment_item_movements (
    item_id, from_storage_location_id, to_storage_location_id, movement_type, moved_by, reason
  ) values (
    p_item_id, v_from_storage, v_to_storage, p_movement_type, auth.uid(), p_reason
  )
  returning * into v_movement;

  update public.equipment_items
  set current_storage_location_id = v_to_storage,
      current_status = coalesce(p_new_status, current_status),
      updated_by = auth.uid()
  where id = p_item_id;

  return v_movement;
end;
$$;

comment on function public.record_warehouse_item_movement is
  'Generic put_away/pick/quarantine/release/scrap movement: relocates one item and, when p_new_status is given, validates and applies the status transition. SECURITY DEFINER for the same reason as record_equipment_item_movement.';

-- 6. record_warehouse_bulk_move (0040): never changes status, but now blocks moving a
-- scrapped item at all.
create or replace function public.record_warehouse_bulk_move(
  p_item_ids uuid[],
  p_to_warehouse_location_id uuid,
  p_reason text default null
)
returns setof public.equipment_item_movements
language plpgsql
security definer
set search_path = public
as $$
declare
  v_to_storage uuid;
  v_batch_id uuid := gen_random_uuid();
  v_item_id uuid;
  v_from_storage uuid;
begin
  if not (
    public.has_permission(auth.uid(), 'warehouse.manage')
    or public.has_permission(auth.uid(), 'warehouse.bulk.move')
  ) then
    raise exception 'Permission denied for bulk move';
  end if;

  v_to_storage := public.resolve_storage_location_for_warehouse_location(p_to_warehouse_location_id);

  foreach v_item_id in array p_item_ids loop
    perform public.assert_equipment_status_transition(
      v_item_id, (select current_status from public.equipment_items where id = v_item_id)
    );

    select current_storage_location_id into v_from_storage
    from public.equipment_items where id = v_item_id;

    insert into public.equipment_item_movements (
      item_id, from_storage_location_id, to_storage_location_id, movement_type,
      moved_by, reason, movement_batch_id
    ) values (
      v_item_id, v_from_storage, v_to_storage, 'bulk_move', auth.uid(), p_reason, v_batch_id
    );

    update public.equipment_items
    set current_storage_location_id = v_to_storage, updated_by = auth.uid()
    where id = v_item_id;
  end loop;

  return query select * from public.equipment_item_movements where movement_batch_id = v_batch_id;
end;
$$;

comment on function public.record_warehouse_bulk_move is
  'Moves every item in p_item_ids to the same destination bin (blocking any that are scrapped), tagging all resulting movement rows with one shared movement_batch_id.';

-- 7. complete_warehouse_transfer_line (0040): doesn't change status, now blocks a
-- scrapped item's line from being completed.
create or replace function public.complete_warehouse_transfer_line(p_line_id uuid)
returns public.warehouse_transfer_lines
language plpgsql
security definer
set search_path = public
as $$
declare
  v_line public.warehouse_transfer_lines;
  v_transfer public.warehouse_transfers;
  v_from_storage uuid;
  v_to_storage uuid;
  v_unit text;
begin
  if not (
    public.has_permission(auth.uid(), 'warehouse.manage')
    or public.has_permission(auth.uid(), 'warehouse.transfer')
  ) then
    raise exception 'Permission denied to complete warehouse transfer lines';
  end if;

  select * into v_line from public.warehouse_transfer_lines where id = p_line_id;
  if not found then
    raise exception 'Transfer line % not found', p_line_id;
  end if;

  select * into v_transfer from public.warehouse_transfers where id = v_line.transfer_id;
  if v_transfer.status not in ('approved', 'in_transit') then
    raise exception 'Transfer % must be approved before its lines can be completed', v_transfer.id;
  end if;
  if v_transfer.to_location_id is null then
    raise exception 'Transfer % has no destination location', v_transfer.id;
  end if;

  v_to_storage := public.resolve_storage_location_for_warehouse_location(v_transfer.to_location_id);
  if v_transfer.from_location_id is not null then
    v_from_storage := public.resolve_storage_location_for_warehouse_location(v_transfer.from_location_id);
  end if;

  if v_line.item_id is not null then
    perform public.assert_equipment_status_transition(
      v_line.item_id, (select current_status from public.equipment_items where id = v_line.item_id)
    );

    if v_from_storage is null then
      select current_storage_location_id into v_from_storage
      from public.equipment_items where id = v_line.item_id;
    end if;

    insert into public.equipment_item_movements (
      item_id, from_storage_location_id, to_storage_location_id, movement_type,
      moved_by, reference_note, warehouse_transfer_id
    ) values (
      v_line.item_id, v_from_storage, v_to_storage, 'transfer',
      auth.uid(), 'Warehouse transfer', v_transfer.id
    );

    update public.equipment_items
    set current_storage_location_id = v_to_storage, updated_by = auth.uid()
    where id = v_line.item_id;
  elsif v_line.model_id is not null then
    if v_from_storage is null then
      raise exception 'Transfer % has no source location, required to move consumable quantities', v_transfer.id;
    end if;

    select unit_of_measure into v_unit
    from public.consumable_stock_levels
    where model_id = v_line.model_id and storage_location_id = v_from_storage;
    v_unit := coalesce(v_unit, 'pcs');

    perform public.adjust_consumable_stock(
      v_line.model_id, v_from_storage, 'transferred_out', -v_line.quantity, v_unit,
      'Warehouse transfer ' || v_transfer.id
    );
    perform public.adjust_consumable_stock(
      v_line.model_id, v_to_storage, 'transferred_in', v_line.quantity, v_unit,
      'Warehouse transfer ' || v_transfer.id
    );
  end if;

  update public.warehouse_transfer_lines
  set status = 'received'
  where id = p_line_id
  returning * into v_line;

  if not exists (
    select 1 from public.warehouse_transfer_lines
    where transfer_id = v_transfer.id and status not in ('received', 'cancelled')
  ) then
    update public.warehouse_transfers
    set status = 'completed', completed_at = now(), updated_by = auth.uid()
    where id = v_transfer.id;
  end if;

  return v_line;
end;
$$;

comment on function public.complete_warehouse_transfer_line is
  'Moves one transfer line''s item or consumable quantity into the transfer''s destination (blocking a scrapped item''s line), logs it in the canonical movement/stock ledgers, and auto-completes the transfer header once every line is received.';

-- 8. complete_warehouse_receiving_line (0040): unchanged target ('available'), now guarded.
create or replace function public.complete_warehouse_receiving_line(p_line_id uuid)
returns public.warehouse_receiving_lines
language plpgsql
security definer
set search_path = public
as $$
declare
  v_line public.warehouse_receiving_lines;
  v_to_storage uuid;
  v_unit text;
begin
  if not (
    public.has_permission(auth.uid(), 'warehouse.manage')
    or public.has_permission(auth.uid(), 'warehouse.receive')
  ) then
    raise exception 'Permission denied to complete warehouse receiving lines';
  end if;

  select * into v_line from public.warehouse_receiving_lines where id = p_line_id;
  if not found then
    raise exception 'Receiving line % not found', p_line_id;
  end if;
  if v_line.destination_warehouse_location_id is null then
    raise exception 'Receiving line % has no destination location', p_line_id;
  end if;

  v_to_storage := public.resolve_storage_location_for_warehouse_location(v_line.destination_warehouse_location_id);

  if v_line.item_id is not null then
    perform public.assert_equipment_status_transition(v_line.item_id, 'available');

    insert into public.equipment_item_movements (
      item_id, from_storage_location_id, to_storage_location_id, movement_type, moved_by, reference_note
    ) values (
      v_line.item_id, null, v_to_storage, 'receive', auth.uid(), 'Warehouse receiving'
    );

    update public.equipment_items
    set current_storage_location_id = v_to_storage, current_status = 'available', updated_by = auth.uid()
    where id = v_line.item_id;
  elsif v_line.model_id is not null then
    select unit_of_measure into v_unit
    from public.consumable_stock_levels
    where model_id = v_line.model_id and storage_location_id = v_to_storage;
    v_unit := coalesce(v_unit, 'pcs');

    perform public.adjust_consumable_stock(
      v_line.model_id, v_to_storage, 'received', v_line.quantity, v_unit, 'Warehouse receiving'
    );
  end if;

  update public.warehouse_receiving_lines set placed = true where id = p_line_id returning * into v_line;

  if not exists (
    select 1 from public.warehouse_receiving_lines
    where receiving_id = v_line.receiving_id and not placed
  ) then
    update public.warehouse_receiving_records
    set status = 'completed', updated_by = auth.uid()
    where id = v_line.receiving_id;
  end if;

  return v_line;
end;
$$;

comment on function public.complete_warehouse_receiving_line is
  'Places one receiving line''s item/consumable quantity into its destination bin (validating the item''s status transition to available) and auto-completes the receiving record once every line is placed.';

-- 9. complete_warehouse_dispatch_line (0040): retargeted from 'in_use' to 'in_transit' --
-- 'in_use' is now reserved for Module 2's internal checkout/checkin loan flow; dispatch
-- to an event/customer is the event-lifecycle pipeline's "In Transit" state.
create or replace function public.complete_warehouse_dispatch_line(p_line_id uuid)
returns public.warehouse_dispatch_lines
language plpgsql
security definer
set search_path = public
as $$
declare
  v_line public.warehouse_dispatch_lines;
  v_dispatch public.warehouse_dispatch_records;
  v_current_storage uuid;
  v_unit text;
begin
  if not (
    public.has_permission(auth.uid(), 'warehouse.manage')
    or public.has_permission(auth.uid(), 'warehouse.dispatch')
  ) then
    raise exception 'Permission denied to complete warehouse dispatch lines';
  end if;

  select * into v_line from public.warehouse_dispatch_lines where id = p_line_id;
  if not found then
    raise exception 'Dispatch line % not found', p_line_id;
  end if;

  select * into v_dispatch from public.warehouse_dispatch_records where id = v_line.dispatch_id;

  if v_line.item_id is not null then
    perform public.assert_equipment_status_transition(v_line.item_id, 'in_transit');

    select current_storage_location_id into v_current_storage
    from public.equipment_items where id = v_line.item_id;
    if v_current_storage is null then
      raise exception 'Item % has no current location to dispatch from', v_line.item_id;
    end if;

    insert into public.equipment_item_movements (
      item_id, from_storage_location_id, to_storage_location_id, movement_type, moved_by, reference_note
    ) values (
      v_line.item_id, v_current_storage, v_current_storage, 'dispatch', auth.uid(),
      v_dispatch.destination_type || coalesce(': ' || v_dispatch.destination_reference, '')
    );

    update public.equipment_items
    set current_status = 'in_transit', updated_by = auth.uid()
    where id = v_line.item_id;
  elsif v_line.model_id is not null then
    if v_line.source_warehouse_location_id is null then
      raise exception 'Dispatch line % has no source location, required for consumable quantities', p_line_id;
    end if;

    v_current_storage := public.resolve_storage_location_for_warehouse_location(v_line.source_warehouse_location_id);

    select unit_of_measure into v_unit
    from public.consumable_stock_levels
    where model_id = v_line.model_id and storage_location_id = v_current_storage;
    v_unit := coalesce(v_unit, 'pcs');

    perform public.adjust_consumable_stock(
      v_line.model_id, v_current_storage, 'consumed', -v_line.quantity, v_unit,
      'Warehouse dispatch: ' || v_dispatch.destination_type
    );
  end if;

  update public.warehouse_dispatch_lines set dispatched = true where id = p_line_id returning * into v_line;

  if not exists (
    select 1 from public.warehouse_dispatch_lines where dispatch_id = v_dispatch.id and not dispatched
  ) then
    update public.warehouse_dispatch_records
    set status = 'dispatched', dispatched_at = now(), dispatched_by = auth.uid(), updated_by = auth.uid()
    where id = v_dispatch.id;
  end if;

  return v_line;
end;
$$;

comment on function public.complete_warehouse_dispatch_line is
  'Records the dispatch movement for one line (item -> in_transit, validated; consumable quantity is decremented from its source bin) and auto-completes the dispatch record once every line is dispatched.';
