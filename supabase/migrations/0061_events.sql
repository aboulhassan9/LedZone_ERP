-- 0061_events: Module 6 (Events). The client/project record itself -- equipment reservations
-- and crew assignment are deliberately NOT this module's job (see the module's original
-- README note); Module 4 (Planning) already owns that ground via equipment_plans, which will
-- gain a real event_id FK to this table in 0063, replacing its event_reference free-text
-- placeholder. Same for CRM's quotes.event_reference.

create table public.events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  customer_id uuid references public.customers (id),
  venue text,
  event_start_at timestamptz not null,
  event_end_at timestamptz not null,
  status text not null default 'planning' check (
    status in ('planning', 'confirmed', 'in_progress', 'completed', 'cancelled')
  ),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id),
  updated_by uuid references public.profiles (id),
  deleted_at timestamptz,
  deleted_by uuid references public.profiles (id),
  constraint events_window check (event_end_at > event_start_at)
);

comment on table public.events is
  'The client/project record for an event. Equipment (Planning) and crew/vehicle bookings (Planning) are deliberately not owned here -- this table links to them via their own event_id FK, it does not duplicate their bookkeeping.';

create index events_customer_id_idx on public.events (customer_id);
create index events_status_idx on public.events (status);
create index events_window_idx on public.events (event_start_at, event_end_at);
create index events_created_by_idx on public.events (created_by);
create index events_updated_by_idx on public.events (updated_by);
create index events_deleted_by_idx on public.events (deleted_by);

create trigger set_events_updated_at
  before update on public.events
  for each row
  execute function public.set_updated_at();

create table public.event_checklist_items (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id),
  title text not null,
  is_done boolean not null default false,
  due_at timestamptz,
  assigned_to uuid references public.profiles (id),
  notes text,
  sequence integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id),
  updated_by uuid references public.profiles (id)
);

comment on table public.event_checklist_items is
  'A to-do item for an event (e.g. "confirm venue access", "send final invoice").';

create index event_checklist_items_event_id_idx on public.event_checklist_items (event_id);
create index event_checklist_items_assigned_to_idx on public.event_checklist_items (assigned_to);

create trigger set_event_checklist_items_updated_at
  before update on public.event_checklist_items
  for each row
  execute function public.set_updated_at();

create table public.event_timeline_items (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id),
  title text not null,
  scheduled_at timestamptz not null,
  duration_minutes integer,
  notes text,
  sequence integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id),
  updated_by uuid references public.profiles (id)
);

comment on table public.event_timeline_items is
  'A scheduled beat within an event day (e.g. "load-in", "soundcheck", "doors", "strike").';

create index event_timeline_items_event_id_idx on public.event_timeline_items (event_id);
create index event_timeline_items_scheduled_at_idx on public.event_timeline_items (scheduled_at);

create trigger set_event_timeline_items_updated_at
  before update on public.event_timeline_items
  for each row
  execute function public.set_updated_at();

alter table public.events enable row level security;
alter table public.event_checklist_items enable row level security;
alter table public.event_timeline_items enable row level security;

create policy "events_select_viewers"
  on public.events for select
  to authenticated
  using (public.has_permission((select auth.uid()), 'events.view'));

create policy "events_insert_managers"
  on public.events for insert
  to authenticated
  with check (
    public.has_permission((select auth.uid()), 'events.manage')
    or public.has_permission((select auth.uid()), 'events.create')
  );

create policy "events_update_managers"
  on public.events for update
  to authenticated
  using (
    public.has_permission((select auth.uid()), 'events.manage')
    or public.has_permission((select auth.uid()), 'events.update')
    or public.has_permission((select auth.uid()), 'events.delete')
  )
  with check (
    public.has_permission((select auth.uid()), 'events.manage')
    or public.has_permission((select auth.uid()), 'events.update')
    or public.has_permission((select auth.uid()), 'events.delete')
  );

create policy "event_checklist_items_select_viewers"
  on public.event_checklist_items for select
  to authenticated
  using (public.has_permission((select auth.uid()), 'events.view'));

create policy "event_checklist_items_insert_managers"
  on public.event_checklist_items for insert
  to authenticated
  with check (
    public.has_permission((select auth.uid()), 'events.manage')
    or public.has_permission((select auth.uid()), 'events.update')
  );

create policy "event_checklist_items_update_managers"
  on public.event_checklist_items for update
  to authenticated
  using (
    public.has_permission((select auth.uid()), 'events.manage')
    or public.has_permission((select auth.uid()), 'events.update')
  )
  with check (
    public.has_permission((select auth.uid()), 'events.manage')
    or public.has_permission((select auth.uid()), 'events.update')
  );

create policy "event_checklist_items_delete_managers"
  on public.event_checklist_items for delete
  to authenticated
  using (
    public.has_permission((select auth.uid()), 'events.manage')
    or public.has_permission((select auth.uid()), 'events.update')
  );

create policy "event_timeline_items_select_viewers"
  on public.event_timeline_items for select
  to authenticated
  using (public.has_permission((select auth.uid()), 'events.view'));

create policy "event_timeline_items_insert_managers"
  on public.event_timeline_items for insert
  to authenticated
  with check (
    public.has_permission((select auth.uid()), 'events.manage')
    or public.has_permission((select auth.uid()), 'events.update')
  );

create policy "event_timeline_items_update_managers"
  on public.event_timeline_items for update
  to authenticated
  using (
    public.has_permission((select auth.uid()), 'events.manage')
    or public.has_permission((select auth.uid()), 'events.update')
  )
  with check (
    public.has_permission((select auth.uid()), 'events.manage')
    or public.has_permission((select auth.uid()), 'events.update')
  );

create policy "event_timeline_items_delete_managers"
  on public.event_timeline_items for delete
  to authenticated
  using (
    public.has_permission((select auth.uid()), 'events.manage')
    or public.has_permission((select auth.uid()), 'events.update')
  );
