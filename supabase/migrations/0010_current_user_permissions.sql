-- 0010_current_user_permissions: lets a signed-in user fetch their OWN effective
-- permission keys (used to render the sidebar/admin UI conditionally) without needing
-- 'roles.manage', which normally gates reading role_permissions/permissions joins.

create or replace function public.get_my_permissions()
returns table (key text)
language sql
stable
security definer
set search_path = public
as $$
  select p.key
  from public.user_roles ur
  join public.roles r on r.id = ur.role_id and r.deleted_at is null and r.status = 'active'
  join public.role_permissions rp on rp.role_id = r.id
  join public.permissions p on p.id = rp.permission_id
  where ur.user_id = auth.uid();
$$;

comment on function public.get_my_permissions is
  'Returns the calling user''s own effective permission keys — safe self-service equivalent of has_permission() for rendering UI.';

revoke execute on function public.get_my_permissions() from anon, public;
grant execute on function public.get_my_permissions() to authenticated;
