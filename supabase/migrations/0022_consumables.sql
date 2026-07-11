-- 0022_consumables: quantity-based stock for non-serialized items (tape, batteries, zip
-- ties, screws) that share the same catalog (equipment_categories/manufacturers/brands/
-- equipment_models) as individually-tracked gear. The only fork is
-- equipment_models.tracking_type = 'consumable' — no existing table changes shape when
-- consumable workflows are built later.

create table public.consumable_stock_levels (
  id uuid primary key default gen_random_uuid(),
  model_id uuid not null references public.equipment_models (id),
  storage_location_id uuid not null references public.storage_locations (id),
  quantity_on_hand numeric(14, 2) not null default 0 check (quantity_on_hand >= 0),
  unit_of_measure text not null default 'pcs',
  reorder_threshold numeric(14, 2),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id)
);

comment on table public.consumable_stock_levels is
  'Current quantity of a consumable model at a storage location. Only meaningful for equipment_models.tracking_type = ''consumable''.';

create unique index consumable_stock_levels_model_location_uq
  on public.consumable_stock_levels (model_id, storage_location_id);
create index consumable_stock_levels_storage_location_id_idx on public.consumable_stock_levels (storage_location_id);
create index consumable_stock_levels_updated_by_idx on public.consumable_stock_levels (updated_by);

create trigger set_consumable_stock_levels_updated_at
  before update on public.consumable_stock_levels
  for each row
  execute function public.set_updated_at();

create table public.consumable_stock_movements (
  id uuid primary key default gen_random_uuid(),
  model_id uuid not null references public.equipment_models (id),
  storage_location_id uuid not null references public.storage_locations (id),
  movement_type text not null check (
    movement_type in ('received', 'consumed', 'adjusted', 'transferred_in', 'transferred_out')
  ),
  quantity_delta numeric(14, 2) not null,
  reference_note text,
  moved_by uuid references public.profiles (id),
  moved_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

comment on table public.consumable_stock_movements is
  'Append-only ledger of consumable quantity changes — the consumable equivalent of equipment_item_movements.';

create index consumable_stock_movements_model_id_idx on public.consumable_stock_movements (model_id);
create index consumable_stock_movements_storage_location_id_idx on public.consumable_stock_movements (storage_location_id);
create index consumable_stock_movements_moved_by_idx on public.consumable_stock_movements (moved_by);

alter table public.consumable_stock_levels enable row level security;
alter table public.consumable_stock_movements enable row level security;

create policy "consumable_stock_levels_select_viewers"
  on public.consumable_stock_levels for select
  to authenticated
  using (public.has_permission((select auth.uid()), 'inventory.view'));

create policy "consumable_stock_levels_insert_managers"
  on public.consumable_stock_levels for insert
  to authenticated
  with check (public.has_permission((select auth.uid()), 'inventory.manage'));

create policy "consumable_stock_levels_update_managers"
  on public.consumable_stock_levels for update
  to authenticated
  using (public.has_permission((select auth.uid()), 'inventory.manage'))
  with check (public.has_permission((select auth.uid()), 'inventory.manage'));

create policy "consumable_stock_levels_delete_managers"
  on public.consumable_stock_levels for delete
  to authenticated
  using (public.has_permission((select auth.uid()), 'inventory.manage'));

create policy "consumable_stock_movements_select_viewers"
  on public.consumable_stock_movements for select
  to authenticated
  using (public.has_permission((select auth.uid()), 'inventory.view'));

create policy "consumable_stock_movements_insert_managers"
  on public.consumable_stock_movements for insert
  to authenticated
  with check (public.has_permission((select auth.uid()), 'inventory.manage'));
