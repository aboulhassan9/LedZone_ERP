-- 0056_planning_function_grants: the security advisor flagged that 0054/0055's nine new
-- functions are executable by the `anon` role (confirmed via has_function_privilege) --
-- unlike every other SECURITY DEFINER RPC in this project, which is not. Each of these
-- functions already rejects an unauthenticated caller internally (auth.uid() is null, so
-- has_permission(null, ...) is false), so this was not a live vulnerability, but it's
-- inconsistent with the rest of the codebase's grant posture and worth closing explicitly,
-- matching has_permission()'s own explicit revoke/grant pair from 0004.

revoke execute on function public.reserve_equipment_item(uuid) from anon, public;
revoke execute on function public.release_equipment_item_reservation(uuid) from anon, public;
revoke execute on function public.return_equipment_item(uuid) from anon, public;
revoke execute on function public.replace_equipment_plan_conflicts(uuid, jsonb, jsonb) from anon, public;
revoke execute on function public.prepare_equipment_plan(uuid, jsonb, jsonb, text) from anon, public;
revoke execute on function public.approve_equipment_plan(uuid, jsonb, text) from anon, public;
revoke execute on function public.load_equipment_plan(uuid, jsonb, text) from anon, public;
revoke execute on function public.complete_equipment_plan(uuid, jsonb, text) from anon, public;
revoke execute on function public.cancel_equipment_plan(uuid, jsonb, text) from anon, public;

grant execute on function public.reserve_equipment_item(uuid) to authenticated;
grant execute on function public.release_equipment_item_reservation(uuid) to authenticated;
grant execute on function public.return_equipment_item(uuid) to authenticated;
grant execute on function public.replace_equipment_plan_conflicts(uuid, jsonb, jsonb) to authenticated;
grant execute on function public.prepare_equipment_plan(uuid, jsonb, jsonb, text) to authenticated;
grant execute on function public.approve_equipment_plan(uuid, jsonb, text) to authenticated;
grant execute on function public.load_equipment_plan(uuid, jsonb, text) to authenticated;
grant execute on function public.complete_equipment_plan(uuid, jsonb, text) to authenticated;
grant execute on function public.cancel_equipment_plan(uuid, jsonb, text) to authenticated;
