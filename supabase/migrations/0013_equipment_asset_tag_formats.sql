-- 0013_equipment_asset_tag_formats: configurable, non-hardcoded asset tag generation.
-- One row per category (optional) plus one optional global-default row. generate_asset_tag()
-- atomically allocates the next sequence number so concurrent item creation never collides.

create table public.equipment_asset_tag_formats (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.equipment_categories (id),
  prefix text not null,
  separator text not null default '-',
  sequence_length smallint not null default 6 check (sequence_length between 1 and 12),
  next_sequence bigint not null default 1 check (next_sequence > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id),
  updated_by uuid references public.profiles (id)
);

comment on table public.equipment_asset_tag_formats is
  'Configurable asset-tag prefix/sequence per category, or one global-default row (category_id null). No prefix is ever hardcoded in application code.';

-- At most one row per category...
create unique index equipment_asset_tag_formats_category_uq
  on public.equipment_asset_tag_formats (category_id)
  where category_id is not null;

-- ...and at most one global-default row.
create unique index equipment_asset_tag_formats_global_uq
  on public.equipment_asset_tag_formats ((category_id is null))
  where category_id is null;

create trigger set_equipment_asset_tag_formats_updated_at
  before update on public.equipment_asset_tag_formats
  for each row
  execute function public.set_updated_at();

-- Seed a global default so generate_asset_tag() always has a fallback even before any
-- category-specific format is configured.
insert into public.equipment_asset_tag_formats (category_id, prefix, separator, sequence_length)
values (null, 'EQ', '-', 6);

-- Atomically allocates and formats the next tag for a category (or the global default if
-- the category has no format of its own). SECURITY DEFINER so it can update the sequence
-- counter regardless of the caller's own UPDATE grant on this table.
create or replace function public.generate_asset_tag(p_category_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_format_id uuid;
  v_prefix text;
  v_separator text;
  v_sequence_length smallint;
  v_sequence bigint;
begin
  select id, prefix, separator, sequence_length, next_sequence
    into v_format_id, v_prefix, v_separator, v_sequence_length, v_sequence
  from public.equipment_asset_tag_formats
  where category_id = p_category_id
  for update;

  if not found then
    select id, prefix, separator, sequence_length, next_sequence
      into v_format_id, v_prefix, v_separator, v_sequence_length, v_sequence
    from public.equipment_asset_tag_formats
    where category_id is null
    for update;
  end if;

  if not found then
    raise exception 'No asset tag format configured (category % has none and no global default exists)', p_category_id;
  end if;

  update public.equipment_asset_tag_formats
  set next_sequence = next_sequence + 1
  where id = v_format_id;

  return v_prefix || v_separator || lpad(v_sequence::text, v_sequence_length, '0');
end;
$$;

comment on function public.generate_asset_tag is
  'Allocates the next human-readable asset tag for a category (e.g. LEDP-000001), falling back to the global default format. Called when a new equipment_item is created.';

revoke execute on function public.generate_asset_tag(uuid) from anon, public;
grant execute on function public.generate_asset_tag(uuid) to authenticated;

alter table public.equipment_asset_tag_formats enable row level security;

create policy "equipment_asset_tag_formats_select_viewers"
  on public.equipment_asset_tag_formats for select
  to authenticated
  using (public.has_permission((select auth.uid()), 'inventory.view'));

create policy "equipment_asset_tag_formats_insert_managers"
  on public.equipment_asset_tag_formats for insert
  to authenticated
  with check (public.has_permission((select auth.uid()), 'inventory.manage'));

create policy "equipment_asset_tag_formats_update_managers"
  on public.equipment_asset_tag_formats for update
  to authenticated
  using (public.has_permission((select auth.uid()), 'inventory.manage'))
  with check (public.has_permission((select auth.uid()), 'inventory.manage'));

create policy "equipment_asset_tag_formats_delete_managers"
  on public.equipment_asset_tag_formats for delete
  to authenticated
  using (public.has_permission((select auth.uid()), 'inventory.manage'));
