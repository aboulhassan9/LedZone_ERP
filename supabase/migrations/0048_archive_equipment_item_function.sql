-- 0048_archive_equipment_item_function: found during the same Module 3.5 review that
-- introduced the equipment status state machine (0045-0046). equipmentItemRepository.
-- archive() previously did a plain PostgREST `.update()` setting current_status directly
-- — not even going through an RPC, let alone assert_equipment_status_transition(). That's
-- the most directly bypassable path of all (no server-side function logic at all beyond
-- RLS). This wraps it in one atomic, guarded function, matching every other
-- status-mutating write in this codebase.

create or replace function public.archive_equipment_item(p_item_id uuid)
returns public.equipment_items
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item public.equipment_items;
begin
  if not public.has_permission(auth.uid(), 'inventory.manage') then
    raise exception 'Permission denied';
  end if;

  if not exists (select 1 from public.equipment_items where id = p_item_id) then
    raise exception 'Equipment item % not found', p_item_id;
  end if;

  perform public.assert_equipment_status_transition(p_item_id, 'scrapped');

  update public.equipment_items
  set current_status = 'scrapped', deleted_at = now(), deleted_by = auth.uid(), updated_by = auth.uid()
  where id = p_item_id
  returning * into v_item;

  return v_item;
end;
$$;

comment on function public.archive_equipment_item is
  'Soft-deletes an equipment item and moves it to scrapped status atomically, after validating the transition. SECURITY DEFINER for the same reason as the other equipment lifecycle RPCs.';

revoke execute on function public.archive_equipment_item(uuid) from anon, public;
grant execute on function public.archive_equipment_item(uuid) to authenticated;
