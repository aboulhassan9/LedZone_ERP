-- 0037_warehouse_reservations: reserves either a location (incoming shipment needs a bin
-- held open) or a specific item (high-priority unit held for an upcoming job) — exactly one
-- of the two. Expiry is evaluated lazily (expires_at < now()) by readers/services; no cron
-- job is required for this to be correct, so none is introduced here.

create table public.warehouse_reservations (
  id uuid primary key default gen_random_uuid(),
  warehouse_location_id uuid references public.warehouse_locations (id),
  item_id uuid references public.equipment_items (id),
  reserved_for_type text not null check (
    reserved_for_type in ('incoming_shipment', 'event', 'repair', 'high_priority')
  ),
  reserved_by uuid references public.profiles (id),
  reserved_at timestamptz not null default now(),
  expires_at timestamptz not null,
  released_at timestamptz,
  reference_note text,
  constraint warehouse_reservations_location_xor_item check (
    (warehouse_location_id is not null and item_id is null)
    or (warehouse_location_id is null and item_id is not null)
  )
);

comment on table public.warehouse_reservations is
  'Reserves a location or an item until expires_at (or until explicitly released_at). Expiry is evaluated at read time, not enforced by a scheduled job.';

create index warehouse_reservations_location_id_idx on public.warehouse_reservations (warehouse_location_id);
create index warehouse_reservations_item_id_idx on public.warehouse_reservations (item_id);
create index warehouse_reservations_reserved_by_idx on public.warehouse_reservations (reserved_by);
create index warehouse_reservations_expires_at_idx on public.warehouse_reservations (expires_at);

alter table public.warehouse_reservations enable row level security;

create policy "warehouse_reservations_select_viewers"
  on public.warehouse_reservations for select
  to authenticated
  using (public.has_permission((select auth.uid()), 'warehouse.view'));

create policy "warehouse_reservations_insert_managers"
  on public.warehouse_reservations for insert
  to authenticated
  with check (
    public.has_permission((select auth.uid()), 'warehouse.manage')
    or public.has_permission((select auth.uid()), 'warehouse.location.manage')
  );

-- The only update path is releasing a reservation early (released_at).
create policy "warehouse_reservations_update_managers"
  on public.warehouse_reservations for update
  to authenticated
  using (
    public.has_permission((select auth.uid()), 'warehouse.manage')
    or public.has_permission((select auth.uid()), 'warehouse.location.manage')
  )
  with check (
    public.has_permission((select auth.uid()), 'warehouse.manage')
    or public.has_permission((select auth.uid()), 'warehouse.location.manage')
  );
