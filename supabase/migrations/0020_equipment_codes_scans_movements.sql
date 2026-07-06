-- 0020_equipment_codes_scans_movements: identification (QR/barcode) and history
-- (scans, movements) — belongs to the item, never the model. Insert policies here tie
-- each of the granular checkout/checkin/transfer/qr.scan/barcode.scan permissions to the
-- specific row values they're allowed to create, so a warehouse worker holding only
-- 'inventory.checkout' can log a check-out movement without full 'inventory.manage'.

create table public.equipment_item_codes (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.equipment_items (id),
  code_type text not null check (code_type in ('qr', 'barcode')),
  code_value text not null unique,
  image_url text,
  is_active boolean not null default true,
  generated_at timestamptz not null default now(),
  superseded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id),
  updated_by uuid references public.profiles (id),
  deleted_at timestamptz,
  deleted_by uuid references public.profiles (id)
);

comment on table public.equipment_item_codes is
  'Every QR/barcode ever issued to an item. A lost tag is superseded (superseded_at set), never deleted, keeping the history intact.';

create index equipment_item_codes_item_id_idx on public.equipment_item_codes (item_id);
create index equipment_item_codes_created_by_idx on public.equipment_item_codes (created_by);
create index equipment_item_codes_updated_by_idx on public.equipment_item_codes (updated_by);
create index equipment_item_codes_deleted_by_idx on public.equipment_item_codes (deleted_by);

create trigger set_equipment_item_codes_updated_at
  before update on public.equipment_item_codes
  for each row
  execute function public.set_updated_at();

create table public.equipment_item_scans (
  id uuid primary key default gen_random_uuid(),
  item_code_id uuid not null references public.equipment_item_codes (id),
  item_id uuid not null references public.equipment_items (id),
  scanned_by uuid references public.profiles (id),
  scanned_at timestamptz not null default now(),
  scan_context text not null default 'lookup' check (
    scan_context in ('lookup', 'check_out', 'check_in', 'maintenance', 'audit', 'other')
  ),
  location_at_scan uuid references public.storage_locations (id),
  device_info jsonb,
  note text,
  created_at timestamptz not null default now()
);

comment on table public.equipment_item_scans is
  'Append-only log of every QR/barcode scan against an item.';

create index equipment_item_scans_item_code_id_idx on public.equipment_item_scans (item_code_id);
create index equipment_item_scans_item_id_idx on public.equipment_item_scans (item_id);
create index equipment_item_scans_scanned_by_idx on public.equipment_item_scans (scanned_by);
create index equipment_item_scans_location_at_scan_idx on public.equipment_item_scans (location_at_scan);

create table public.equipment_item_movements (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.equipment_items (id),
  from_storage_location_id uuid references public.storage_locations (id),
  to_storage_location_id uuid not null references public.storage_locations (id),
  moved_at timestamptz not null default now(),
  moved_by uuid references public.profiles (id),
  movement_type text not null check (
    movement_type in ('initial_placement', 'transfer', 'check_out', 'check_in')
  ),
  reference_note text,
  created_at timestamptz not null default now()
);

comment on table public.equipment_item_movements is
  'Append-only location/movement history. Future modules (Events, Rental) add proper FK columns here (e.g. event_id) rather than relying solely on reference_note.';

create index equipment_item_movements_item_id_idx on public.equipment_item_movements (item_id);
create index equipment_item_movements_from_storage_location_id_idx on public.equipment_item_movements (from_storage_location_id);
create index equipment_item_movements_to_storage_location_id_idx on public.equipment_item_movements (to_storage_location_id);
create index equipment_item_movements_moved_by_idx on public.equipment_item_movements (moved_by);

alter table public.equipment_item_codes enable row level security;
alter table public.equipment_item_scans enable row level security;
alter table public.equipment_item_movements enable row level security;

create policy "equipment_item_codes_select_viewers"
  on public.equipment_item_codes for select
  to authenticated
  using (public.has_permission((select auth.uid()), 'inventory.view'));

create policy "equipment_item_codes_insert_managers"
  on public.equipment_item_codes for insert
  to authenticated
  with check (public.has_permission((select auth.uid()), 'inventory.manage'));

create policy "equipment_item_codes_update_managers"
  on public.equipment_item_codes for update
  to authenticated
  using (public.has_permission((select auth.uid()), 'inventory.manage'))
  with check (public.has_permission((select auth.uid()), 'inventory.manage'));

create policy "equipment_item_codes_delete_managers"
  on public.equipment_item_codes for delete
  to authenticated
  using (public.has_permission((select auth.uid()), 'inventory.manage'));

create policy "equipment_item_scans_select_viewers"
  on public.equipment_item_scans for select
  to authenticated
  using (public.has_permission((select auth.uid()), 'inventory.view'));

-- Which scan permission applies depends on the code's own type, looked up via item_code_id.
create policy "equipment_item_scans_insert_scanners"
  on public.equipment_item_scans for insert
  to authenticated
  with check (
    public.has_permission((select auth.uid()), 'inventory.manage')
    or (
      (select code_type from public.equipment_item_codes where id = item_code_id) = 'qr'
      and public.has_permission((select auth.uid()), 'inventory.qr.scan')
    )
    or (
      (select code_type from public.equipment_item_codes where id = item_code_id) = 'barcode'
      and public.has_permission((select auth.uid()), 'inventory.barcode.scan')
    )
  );

create policy "equipment_item_movements_select_viewers"
  on public.equipment_item_movements for select
  to authenticated
  using (public.has_permission((select auth.uid()), 'inventory.view'));

-- Which movement permission applies depends on the movement_type of the row being inserted.
create policy "equipment_item_movements_insert_movers"
  on public.equipment_item_movements for insert
  to authenticated
  with check (
    public.has_permission((select auth.uid()), 'inventory.manage')
    or (movement_type = 'check_out' and public.has_permission((select auth.uid()), 'inventory.checkout'))
    or (movement_type = 'check_in' and public.has_permission((select auth.uid()), 'inventory.checkin'))
    or (movement_type = 'transfer' and public.has_permission((select auth.uid()), 'inventory.transfer'))
  );
