-- 0044_warehouse_location_code_function: Module 3.4 (QR/Barcode Warehouse Operations).
-- warehouse_location_codes (0029) and its RLS policies already exist, but no transactional
-- assign function was added in Module 3.1 — only equipment_item_codes got one
-- (assign_equipment_item_code, 0026). This adds the exact same pattern for locations:
-- supersede any existing active code of the same type, then insert the new one, in one
-- transaction so a location is never left with two simultaneously-active codes of the same
-- type. SECURITY INVOKER (no explicit permission check) because warehouse_location_codes'
-- RLS already requires warehouse.manage OR warehouse.qr.generate on both the update and the
-- insert — identical to how assign_equipment_item_code relies on equipment_item_codes' RLS.

create or replace function public.assign_warehouse_location_code(
  p_location_id uuid,
  p_code_type text,
  p_code_value text,
  p_image_url text default null
)
returns public.warehouse_location_codes
language plpgsql
set search_path = public
as $$
declare
  v_code public.warehouse_location_codes;
begin
  update public.warehouse_location_codes
  set is_active = false, superseded_at = now()
  where warehouse_location_id = p_location_id and code_type = p_code_type and is_active = true;

  insert into public.warehouse_location_codes (
    warehouse_location_id, code_type, code_value, image_url, created_by
  ) values (
    p_location_id, p_code_type, p_code_value, p_image_url, auth.uid()
  )
  returning * into v_code;

  return v_code;
end;
$$;

comment on function public.assign_warehouse_location_code is
  'Supersedes any existing active code of the same type for the location, then issues a new one. One transaction so a location is never left with two simultaneously-active codes of the same type.';

revoke execute on function public.assign_warehouse_location_code(uuid, text, text, text) from anon, public;
grant execute on function public.assign_warehouse_location_code(uuid, text, text, text) to authenticated;
