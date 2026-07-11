-- 0040_warehouse_transactional_functions: transaction boundaries for multi-table warehouse
-- writes, called via supabase.rpc() from the Service Layer (Module 3.2) — same pattern as
-- 0026_inventory_transactional_functions.sql. All are SECURITY DEFINER with an explicit
-- has_permission() check at the top: each one updates equipment_items and/or
-- consumable_stock_levels, whose blanket policies require 'inventory.manage', on behalf of a
-- caller who only holds a narrower 'warehouse.*' permission — the same justification already
-- documented for record_equipment_item_movement in 0026.
--
-- Deliberately deferred to the Service Layer (not solved here): auto-provisioning a
-- storage_locations row for a warehouse_locations bin that has none yet (resolve_* raises a
-- clear error instead of silently creating one), and any cross-service orchestration such as
-- filing a lost report when a cycle count finds an individually-tracked item missing.

-- Looks up the storage_locations row bridged to a warehouse_locations node (0030). Raises if
-- the bin hasn't been bridged yet — callers must ensure that first (Service Layer's job).
create or replace function public.resolve_storage_location_for_warehouse_location(p_warehouse_location_id uuid)
returns uuid
language plpgsql
stable
set search_path = public
as $$
declare
  v_storage_location_id uuid;
begin
  select id into v_storage_location_id
  from public.storage_locations
  where warehouse_location_id = p_warehouse_location_id
    and deleted_at is null
  limit 1;

  if not found then
    raise exception 'Warehouse location % has no bridged storage_locations row yet', p_warehouse_location_id;
  end if;

  return v_storage_location_id;
end;
$$;

revoke execute on function public.resolve_storage_location_for_warehouse_location(uuid) from anon, public;
grant execute on function public.resolve_storage_location_for_warehouse_location(uuid) to authenticated;

-- 1. Approve a pending transfer.
create or replace function public.approve_warehouse_transfer(p_transfer_id uuid)
returns public.warehouse_transfers
language plpgsql
security definer
set search_path = public
as $$
declare
  v_transfer public.warehouse_transfers;
begin
  if not (
    public.has_permission(auth.uid(), 'warehouse.manage')
    or public.has_permission(auth.uid(), 'warehouse.approve')
  ) then
    raise exception 'Permission denied to approve warehouse transfers';
  end if;

  update public.warehouse_transfers
  set status = 'approved', approved_by = auth.uid(), approved_at = now(), updated_by = auth.uid()
  where id = p_transfer_id and status = 'pending'
  returning * into v_transfer;

  if not found then
    raise exception 'Transfer % is not pending (or does not exist)', p_transfer_id;
  end if;

  return v_transfer;
end;
$$;

comment on function public.approve_warehouse_transfer is
  'Transitions a transfer from pending to approved. SECURITY DEFINER so a warehouse.approve-only holder can update warehouse_transfers despite its blanket UPDATE policy also requiring warehouse.manage/transfer for ordinary edits — this function checks the approval permission specifically.';

revoke execute on function public.approve_warehouse_transfer(uuid) from anon, public;
grant execute on function public.approve_warehouse_transfer(uuid) to authenticated;

-- 2. Complete one transfer line: moves the item (or consumable quantity) from the transfer's
-- source location to its destination, logs the movement/stock ledger, and auto-completes the
-- transfer header once every line is received.
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
  'Moves one transfer line''s item or consumable quantity into the transfer''s destination, logs it in the canonical movement/stock ledgers, and auto-completes the transfer header once every line is received.';

revoke execute on function public.complete_warehouse_transfer_line(uuid) from anon, public;
grant execute on function public.complete_warehouse_transfer_line(uuid) to authenticated;

-- 3. Complete one receiving line: places the item/consumable into its destination bin.
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
  'Places one receiving line''s item/consumable quantity into its destination bin and auto-completes the receiving record once every line is placed.';

revoke execute on function public.complete_warehouse_receiving_line(uuid) from anon, public;
grant execute on function public.complete_warehouse_receiving_line(uuid) to authenticated;

-- 4. Complete one dispatch line. Items are recorded as dispatched from wherever they
-- currently sit (dispatch does not require a separate "dispatch bay" concept); consumable
-- lines require an explicit source_warehouse_location_id.
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
    set current_status = 'in_use', updated_by = auth.uid()
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
  'Records the dispatch movement for one line (item stays at its current bin, marked in_use; consumable quantity is decremented from its source bin) and auto-completes the dispatch record once every line is dispatched.';

revoke execute on function public.complete_warehouse_dispatch_line(uuid) from anon, public;
grant execute on function public.complete_warehouse_dispatch_line(uuid) to authenticated;

-- 5. Apply one cycle count line's variance. Consumable variance adjusts stock directly;
-- individually-tracked item variance is flagged applied but any follow-up (e.g. filing a lost
-- report when an item isn't found) is deliberately left to the Service Layer, which already
-- has incidentService.createLostReport() for exactly that.
create or replace function public.apply_warehouse_cycle_count_adjustment(p_line_id uuid)
returns public.warehouse_cycle_count_lines
language plpgsql
security definer
set search_path = public
as $$
declare
  v_line public.warehouse_cycle_count_lines;
  v_count public.warehouse_cycle_counts;
  v_storage uuid;
  v_unit text;
begin
  if not (
    public.has_permission(auth.uid(), 'warehouse.manage')
    or public.has_permission(auth.uid(), 'warehouse.approve')
  ) then
    raise exception 'Permission denied to apply cycle count adjustments';
  end if;

  select * into v_line from public.warehouse_cycle_count_lines where id = p_line_id;
  if not found then
    raise exception 'Cycle count line % not found', p_line_id;
  end if;
  if v_line.counted_qty is null then
    raise exception 'Cycle count line % has not been counted yet', p_line_id;
  end if;

  select * into v_count from public.warehouse_cycle_counts where id = v_line.cycle_count_id;

  if v_line.model_id is not null and v_line.variance <> 0 then
    if v_count.scope_location_id is null then
      raise exception 'Cycle count % has no scope location, required to adjust consumable stock', v_count.id;
    end if;

    v_storage := public.resolve_storage_location_for_warehouse_location(v_count.scope_location_id);

    select unit_of_measure into v_unit
    from public.consumable_stock_levels
    where model_id = v_line.model_id and storage_location_id = v_storage;
    v_unit := coalesce(v_unit, 'pcs');

    perform public.adjust_consumable_stock(
      v_line.model_id, v_storage, 'adjusted', v_line.variance, v_unit,
      'Cycle count ' || v_count.id || ' adjustment'
    );
  end if;

  update public.warehouse_cycle_count_lines set adjustment_applied = true where id = p_line_id
  returning * into v_line;

  return v_line;
end;
$$;

comment on function public.apply_warehouse_cycle_count_adjustment is
  'Applies one cycle count line''s variance to consumable stock (item variance is flagged applied only — lost/found handling for individually-tracked items is a Service Layer decision via incidentService).';

revoke execute on function public.apply_warehouse_cycle_count_adjustment(uuid) from anon, public;
grant execute on function public.apply_warehouse_cycle_count_adjustment(uuid) to authenticated;

-- 6. Generic single-item movement covering put_away/pick/quarantine/release/scrap — all are
-- "move this item to that bin, optionally changing its status" with no other side effects,
-- so one function covers all five instead of five near-duplicates.
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

  -- scrap has no narrower permission of its own — only warehouse.manage (the unconditional
  -- base case below) may perform it.
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
  'Generic put_away/pick/quarantine/release/scrap movement: relocates one item and optionally sets its status. SECURITY DEFINER for the same reason as record_equipment_item_movement — narrower warehouse.* permissions must still be able to update equipment_items.';

revoke execute on function public.record_warehouse_item_movement(uuid, uuid, text, text, text) from anon, public;
grant execute on function public.record_warehouse_item_movement(uuid, uuid, text, text, text) to authenticated;

-- 7. Bulk move: relocates many items to the same destination in one call, sharing a single
-- movement_batch_id so the batch can be queried/rolled back as a unit.
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
  'Moves every item in p_item_ids to the same destination bin, tagging all resulting movement rows with one shared movement_batch_id.';

revoke execute on function public.record_warehouse_bulk_move(uuid[], uuid, text) from anon, public;
grant execute on function public.record_warehouse_bulk_move(uuid[], uuid, text) to authenticated;
