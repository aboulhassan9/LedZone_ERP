-- 0009_notifications: per-user notifications feed backing Settings > Notifications.
-- Rows are created by lib/services/notification-service, either via the service-role
-- client (bypasses RLS) or by a user holding 'notifications.manage'.

insert into public.permissions (key, module, action, description) values
  ('notifications.manage', 'notifications', 'manage', 'Send notifications to other users');

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  body text,
  type text not null default 'info' check (type in ('info', 'success', 'warning', 'error')),
  link_url text,
  is_read boolean not null default false,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  deleted_at timestamptz -- user-side "clear notification", not an admin audit concern
);

comment on table public.notifications is 'Per-user notification inbox.';

create index notifications_user_unread_idx
  on public.notifications (user_id, created_at desc)
  where deleted_at is null;

alter table public.notifications enable row level security;

create policy "notifications_select_own"
  on public.notifications for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "notifications_update_own"
  on public.notifications for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "notifications_insert_managers"
  on public.notifications for insert
  to authenticated
  with check (public.has_permission((select auth.uid()), 'notifications.manage'));
