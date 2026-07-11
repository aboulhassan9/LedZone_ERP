-- 0026_inventory_transactional_functions: the Inventory Service Layer needs real
-- transactions for multi-table writes (e.g. create item + initial movement, or damage
-- report + status change), but a PostgREST/Supabase-JS client can't span multiple
-- statements in one transaction. These Postgres functions are the transaction boundary —
-- each function body is one atomic unit of work, called via supabase.rpc() from the
-- TypeScript service layer.
--
-- Two authorization styles are used, matching whichever is actually correct per function:
--   - create_equipment_item, assign_equipment_item_code, adjust_consumable_stock are
--     SECURITY INVOKER (the default): every table they touch already requires the SAME
--     permission ('inventory.manage') on every sub-statement via existing RLS, so no gap
--     exists and RLS enforces it exactly as if the caller ran the statements directly.
--   - record_equipment_item_movement, create_damage_report, create_lost_report,
--     create_maintenance_record are SECURITY DEFINER with an explicit has_permission()
--     check at the top, because they legitimately need to update equipment_items
--     (whose blanket UPDATE policy requires 'inventory.manage') on behalf of a caller who
--     only holds a narrower permission (e.g. 'inventory.checkout' or
--     'inventory.maintenance.manage') — RLS is row-level, not column-level, so it can't
--     express "this permission may only update these two columns"; the function body does.

create or replace function public.create_equipment_item(
  p_model_id uuid,
  p_serial_number text default null,
  p_purchase_id uuid default null,
  p_storage_location_id uuid default null,
  p_current_condition text default 'new',
  p_notes text default null
)
returns public.equipment_items
language plpgsql
as $$
declare
  v_category_id uuid;
  v_asset_tag text;
  v_item public.equipment_items;
begin
  select category_id into v_category_id from public.equipment_models where id = p_model_id;
  if not found then
    raise exception 'Equipment model % not found', p_model_id;
  end if;

  v_asset_tag := public.generate_asset_tag(v_category_id);

  insert into public.equipment_items (
    model_id, asset_tag, serial_number, purchase_id, current_condition,
    current_storage_location_id, notes, created_by, updated_by
  ) values (
    p_model_id, v_asset_tag, p_serial_number, p_purchase_id, p_current_condition,
    p_storage_location_id, p_notes, auth.uid(), auth.uid()
  )
  returning * into v_item;

  if p_storage_location_id is not null then
    insert into public.equipment_item_movements (
      item_id, from_storage_location_id, to_storage_location_id, movement_type, moved_by
    ) values (
      v_item.id, null, p_storage_location_id, 'initial_placement', auth.uid()
    );
  end if;

  return v_item;
end;
$$;

comment on function public.create_equipment_item is
  'Creates a physical equipment item: auto-generates its asset tag from the model''s category, and records an initial_placement movement if a storage location is given. One transaction.';

revoke execute on function public.create_equipment_item(uuid, text, uuid, uuid, text, text) from anon, public;
grant execute on function public.create_equipment_item(uuid, text, uuid, uuid, text, text) to authenticated;

create or replace function public.assign_equipment_item_code(
  p_item_id uuid,
  p_code_type text,
  p_code_value text,
  p_image_url text default null
)
returns public.equipment_item_codes
language plpgsql
as $$
declare
  v_code public.equipment_item_codes;
begin
  update public.equipment_item_codes
  set is_active = false, superseded_at = now(), updated_by = auth.uid()
  where item_id = p_item_id and code_type = p_code_type and is_active = true;

  insert into public.equipment_item_codes (
    item_id, code_type, code_value, image_url, created_by, updated_by
  ) values (
    p_item_id, p_code_type, p_code_value, p_image_url, auth.uid(), auth.uid()
  )
  returning * into v_code;

  return v_code;
end;
$$;

comment on function public.assign_equipment_item_code is
  'Supersedes any existing active code of the same type for the item, then issues a new one. One transaction so an item is never left with two simultaneously-active codes of the same type.';

revoke execute on function public.assign_equipment_item_code(uuid, text, text, text) from anon, public;
grant execute on function public.assign_equipment_item_code(uuid, text, text, text) to authenticated;

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

  select current_storage_location_id into v_from_location
  from public.equipment_items where id = p_item_id;

  if not found then
    raise exception 'Equipment item % not found', p_item_id;
  end if;

  insert into public.equipment_item_movements (
    item_id, from_storage_location_id, to_storage_location_id, movement_type, reference_note, moved_by
  ) values (
    p_item_id, v_from_location, p_to_storage_location_id, p_movement_type, p_reference_note, auth.uid()
  )
  returning * into v_movement;

  v_new_status := case p_movement_type
    when 'check_out' then 'in_use'
    when 'check_in' then 'available'
    else null
  end;

  update public.equipment_items
  set current_storage_location_id = p_to_storage_location_id,
      current_status = coalesce(v_new_status, current_status),
      updated_by = auth.uid()
  where id = p_item_id;

  return v_movement;
end;
$$;

comment on function public.record_equipment_item_movement is
  'Records a transfer/check_out/check_in movement and updates the item''s location (and status, for check_out/check_in) atomically. SECURITY DEFINER so a checkout/checkin/transfer-only permission holder can update equipment_items despite its blanket UPDATE policy requiring inventory.manage — this function enforces the narrower permission itself.';

revoke execute on function public.record_equipment_item_movement(uuid, uuid, text, text) from anon, public;
grant execute on function public.record_equipment_item_movement(uuid, uuid, text, text) to authenticated;

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

  insert into public.equipment_damage_reports (
    item_id, reported_by, description, severity, repair_cost, currency_code, created_by, updated_by
  ) values (
    p_item_id, auth.uid(), p_description, p_severity, p_repair_cost, p_currency_code, auth.uid(), auth.uid()
  )
  returning * into v_report;

  update public.equipment_items
  set current_status = 'damaged', updated_by = auth.uid()
  where id = p_item_id;

  return v_report;
end;
$$;

comment on function public.create_damage_report is
  'Logs a damage report and moves the item to damaged status atomically. SECURITY DEFINER so an inventory.maintenance.manage holder (without inventory.manage) can still trigger the status change.';

revoke execute on function public.create_damage_report(uuid, text, text, numeric, text) from anon, public;
grant execute on function public.create_damage_report(uuid, text, text, numeric, text) to authenticated;

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
  'Logs a lost report and moves the item to lost status atomically. SECURITY DEFINER for the same reason as create_damage_report.';

revoke execute on function public.create_lost_report(uuid, text, uuid) from anon, public;
grant execute on function public.create_lost_report(uuid, text, uuid) to authenticated;

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
  'Logs a maintenance record, rolls the linked schedule''s due date forward if any, and optionally returns the item to available status — all atomically. SECURITY DEFINER for the same reason as create_damage_report.';

revoke execute on function public.create_maintenance_record(uuid, text, uuid, uuid, text, numeric, text, text, date, boolean) from anon, public;
grant execute on function public.create_maintenance_record(uuid, text, uuid, uuid, text, numeric, text, text, date, boolean) to authenticated;

create or replace function public.adjust_consumable_stock(
  p_model_id uuid,
  p_storage_location_id uuid,
  p_movement_type text,
  p_quantity_delta numeric,
  p_unit_of_measure text default 'pcs',
  p_reference_note text default null
)
returns public.consumable_stock_movements
language plpgsql
as $$
declare
  v_movement public.consumable_stock_movements;
begin
  insert into public.consumable_stock_levels (model_id, storage_location_id, quantity_on_hand, unit_of_measure, updated_by)
  values (p_model_id, p_storage_location_id, p_quantity_delta, p_unit_of_measure, auth.uid())
  on conflict (model_id, storage_location_id)
  do update set
    quantity_on_hand = consumable_stock_levels.quantity_on_hand + p_quantity_delta,
    unit_of_measure = excluded.unit_of_measure,
    updated_at = now(),
    updated_by = auth.uid();

  insert into public.consumable_stock_movements (
    model_id, storage_location_id, movement_type, quantity_delta, reference_note, moved_by
  ) values (
    p_model_id, p_storage_location_id, p_movement_type, p_quantity_delta, p_reference_note, auth.uid()
  )
  returning * into v_movement;

  return v_movement;
end;
$$;

comment on function public.adjust_consumable_stock is
  'Upserts the stock level and appends a ledger movement atomically. The quantity_on_hand >= 0 check constraint naturally rejects a consumption that would go negative (surfaced to the caller as a Postgres error, translated to a ConflictError in the service layer).';

revoke execute on function public.adjust_consumable_stock(uuid, uuid, text, numeric, text, text) from anon, public;
grant execute on function public.adjust_consumable_stock(uuid, uuid, text, numeric, text, text) to authenticated;
