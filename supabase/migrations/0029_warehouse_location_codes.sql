-- 0029_warehouse_location_codes: QR/barcode identity for a warehouse_locations node, mirroring
-- equipment_item_codes (0020). Labels are generated with the existing
-- lib/services/qr-generator.ts / barcode-generator.ts and stored under a
-- `warehouse-labels/` path in the existing public `qr-codes`/`barcodes` buckets — these are
-- printable labels, same as item codes, so no new Storage bucket is needed here.

create table public.warehouse_location_codes (
  id uuid primary key default gen_random_uuid(),
  warehouse_location_id uuid not null references public.warehouse_locations (id),
  code_type text not null check (code_type in ('qr', 'barcode')),
  code_value text not null,
  image_url text,
  is_active boolean not null default true,
  generated_at timestamptz not null default now(),
  superseded_at timestamptz,
  created_by uuid references public.profiles (id)
);

comment on table public.warehouse_location_codes is
  'QR/barcode issuance history for a warehouse location. Belongs to the location node, never to an item.';

create unique index warehouse_location_codes_code_value_uq on public.warehouse_location_codes (code_value);
create index warehouse_location_codes_location_id_idx on public.warehouse_location_codes (warehouse_location_id);
create index warehouse_location_codes_created_by_idx on public.warehouse_location_codes (created_by);

-- Only one active code per (location, type) at a time.
create unique index warehouse_location_codes_active_uq
  on public.warehouse_location_codes (warehouse_location_id, code_type)
  where is_active;

alter table public.warehouse_location_codes enable row level security;

create policy "warehouse_location_codes_select_viewers"
  on public.warehouse_location_codes for select
  to authenticated
  using (public.has_permission((select auth.uid()), 'warehouse.view'));

create policy "warehouse_location_codes_insert_generators"
  on public.warehouse_location_codes for insert
  to authenticated
  with check (
    public.has_permission((select auth.uid()), 'warehouse.manage')
    or public.has_permission((select auth.uid()), 'warehouse.qr.generate')
  );

-- Superseding an old code (setting superseded_at/is_active) is the only update path.
create policy "warehouse_location_codes_update_generators"
  on public.warehouse_location_codes for update
  to authenticated
  using (
    public.has_permission((select auth.uid()), 'warehouse.manage')
    or public.has_permission((select auth.uid()), 'warehouse.qr.generate')
  )
  with check (
    public.has_permission((select auth.uid()), 'warehouse.manage')
    or public.has_permission((select auth.uid()), 'warehouse.qr.generate')
  );
