-- 0014_equipment_models: the catalog layer ("what this product is"), shared by both
-- individually-tracked equipment and future consumables via `tracking_type`.
-- equipment_specification_definitions is metadata only (drives future dynamic forms) —
-- the actual per-model values live in equipment_models.specifications (jsonb), so adding
-- a new spec field is a data change, never a migration.

create table public.equipment_models (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.equipment_categories (id),
  manufacturer_id uuid not null references public.manufacturers (id),
  brand_id uuid references public.brands (id),
  model_name text not null,
  model_number text,
  description text,
  tracking_type text not null default 'individual' check (tracking_type in ('individual', 'consumable')),
  specifications jsonb not null default '{}'::jsonb,
  default_warranty_months integer check (default_warranty_months >= 0),
  expected_lifespan_months integer check (expected_lifespan_months >= 0),
  image_url text,
  status text not null default 'active' check (status in ('active', 'inactive', 'discontinued')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id),
  updated_by uuid references public.profiles (id),
  deleted_at timestamptz,
  deleted_by uuid references public.profiles (id)
);

comment on table public.equipment_models is
  'Catalog definition of a product type (e.g. "ROE Visual Black Pearl BP2"). Never scanned/tracked itself — tracking_type decides whether physical units become equipment_items (individual) or consumable_stock rows (consumable).';
comment on column public.equipment_models.specifications is
  'Freeform key/value spec data (pixel pitch, wattage, ...). See equipment_specification_definitions for the per-category schema this is expected to follow.';

create index equipment_models_category_id_idx on public.equipment_models (category_id);
create index equipment_models_manufacturer_id_idx on public.equipment_models (manufacturer_id);
create index equipment_models_brand_id_idx on public.equipment_models (brand_id);
create index equipment_models_created_by_idx on public.equipment_models (created_by);
create index equipment_models_updated_by_idx on public.equipment_models (updated_by);
create index equipment_models_deleted_by_idx on public.equipment_models (deleted_by);

create trigger set_equipment_models_updated_at
  before update on public.equipment_models
  for each row
  execute function public.set_updated_at();

create table public.equipment_specification_definitions (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.equipment_categories (id),
  spec_key text not null,
  label text not null,
  data_type text not null default 'text' check (data_type in ('text', 'number', 'boolean')),
  unit text,
  display_order integer not null default 0,
  is_required boolean not null default false,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id),
  updated_by uuid references public.profiles (id),
  deleted_at timestamptz,
  deleted_by uuid references public.profiles (id)
);

comment on table public.equipment_specification_definitions is
  'Per-category schema for equipment_models.specifications — e.g. category "LED Panels" defines pixel_pitch/cabinet_size/brightness. Metadata only; does not constrain the jsonb column at the DB level.';

create unique index equipment_specification_definitions_category_key_uq
  on public.equipment_specification_definitions (category_id, spec_key);
create index equipment_specification_definitions_created_by_idx on public.equipment_specification_definitions (created_by);
create index equipment_specification_definitions_updated_by_idx on public.equipment_specification_definitions (updated_by);
create index equipment_specification_definitions_deleted_by_idx on public.equipment_specification_definitions (deleted_by);

create trigger set_equipment_specification_definitions_updated_at
  before update on public.equipment_specification_definitions
  for each row
  execute function public.set_updated_at();

alter table public.equipment_models enable row level security;
alter table public.equipment_specification_definitions enable row level security;

create policy "equipment_models_select_viewers"
  on public.equipment_models for select
  to authenticated
  using (public.has_permission((select auth.uid()), 'inventory.view'));

create policy "equipment_models_insert_managers"
  on public.equipment_models for insert
  to authenticated
  with check (public.has_permission((select auth.uid()), 'inventory.manage'));

create policy "equipment_models_update_managers"
  on public.equipment_models for update
  to authenticated
  using (public.has_permission((select auth.uid()), 'inventory.manage'))
  with check (public.has_permission((select auth.uid()), 'inventory.manage'));

create policy "equipment_models_delete_managers"
  on public.equipment_models for delete
  to authenticated
  using (public.has_permission((select auth.uid()), 'inventory.manage'));

create policy "equipment_specification_definitions_select_viewers"
  on public.equipment_specification_definitions for select
  to authenticated
  using (public.has_permission((select auth.uid()), 'inventory.view'));

create policy "equipment_specification_definitions_insert_managers"
  on public.equipment_specification_definitions for insert
  to authenticated
  with check (public.has_permission((select auth.uid()), 'inventory.manage'));

create policy "equipment_specification_definitions_update_managers"
  on public.equipment_specification_definitions for update
  to authenticated
  using (public.has_permission((select auth.uid()), 'inventory.manage'))
  with check (public.has_permission((select auth.uid()), 'inventory.manage'));

create policy "equipment_specification_definitions_delete_managers"
  on public.equipment_specification_definitions for delete
  to authenticated
  using (public.has_permission((select auth.uid()), 'inventory.manage'));
