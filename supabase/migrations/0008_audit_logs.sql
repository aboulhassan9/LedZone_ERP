-- 0008_audit_logs: append-only audit trail. Every module logs through log_audit_event()
-- rather than per-table triggers, so adding audit coverage to a new module never touches
-- this migration or requires schema changes here.

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles (id),
  action text not null,       -- e.g. 'user.invited', 'role.permission_granted'
  entity_type text not null,  -- e.g. 'profiles', 'roles'
  entity_id uuid,
  changes jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

comment on table public.audit_logs is
  'Append-only. Rows are written exclusively through log_audit_event() — there is no direct INSERT policy for authenticated users.';

create index audit_logs_entity_idx on public.audit_logs (entity_type, entity_id);
create index audit_logs_actor_idx on public.audit_logs (actor_id);
create index audit_logs_created_at_idx on public.audit_logs (created_at desc);

-- SECURITY DEFINER, owned by the migration role (table owner), so it bypasses audit_logs'
-- RLS to insert on the caller's behalf — while always taking the actor from auth.uid()
-- itself (never a caller-supplied value) so a user cannot forge another user's actions.
create or replace function public.log_audit_event(
  p_action text,
  p_entity_type text,
  p_entity_id uuid default null,
  p_changes jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into public.audit_logs (actor_id, action, entity_type, entity_id, changes)
  values (auth.uid(), p_action, p_entity_type, p_entity_id, p_changes)
  returning id into v_id;

  return v_id;
end;
$$;

-- Callable by any signed-in user (it logs their own actions only), never by anon.
revoke execute on function public.log_audit_event(text, text, uuid, jsonb) from anon, public;
grant execute on function public.log_audit_event(text, text, uuid, jsonb) to authenticated;

alter table public.audit_logs enable row level security;

create policy "audit_logs_select_viewers"
  on public.audit_logs for select
  to authenticated
  using (public.has_permission((select auth.uid()), 'audit.view'));
