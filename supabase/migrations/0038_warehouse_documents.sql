-- 0038_warehouse_documents: photos, inspection forms, transfer documents, packing lists,
-- delivery notes, and signatures for transfers/receiving/dispatch/cycle-counts/locations, in
-- a new private `warehouse-docs` bucket (mirrors the equipment-docs pattern from 0021). One
-- shared table with a light polymorphic (related_entity_type, related_entity_id) pair,
-- instead of five near-identical per-parent attachment tables — these rows are otherwise
-- identical (file/description/uploader) regardless of which workflow they belong to.

insert into storage.buckets (id, name, public) values ('warehouse-docs', 'warehouse-docs', false)
on conflict (id) do nothing;

create table public.warehouse_documents (
  id uuid primary key default gen_random_uuid(),
  related_entity_type text not null check (
    related_entity_type in ('transfer', 'receiving', 'dispatch', 'cycle_count', 'warehouse_location')
  ),
  related_entity_id uuid not null,
  document_type text not null check (
    document_type in (
      'photo', 'inspection_form', 'damage_report', 'transfer_document',
      'packing_list', 'delivery_note', 'signature', 'other'
    )
  ),
  file_name text not null,
  storage_path text not null unique,
  mime_type text,
  file_size_bytes bigint,
  uploaded_by uuid references public.profiles (id),
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id),
  updated_by uuid references public.profiles (id),
  deleted_at timestamptz,
  deleted_by uuid references public.profiles (id)
);

comment on table public.warehouse_documents is
  'Documents attached to a transfer/receiving/dispatch/cycle_count/warehouse_location, stored in the warehouse-docs bucket. related_entity_id is not a DB-enforced FK (it points at one of five different tables depending on related_entity_type) — the service layer validates it references a real row of the matching type before insert.';

create index warehouse_documents_related_entity_idx
  on public.warehouse_documents (related_entity_type, related_entity_id);
create index warehouse_documents_uploaded_by_idx on public.warehouse_documents (uploaded_by);
create index warehouse_documents_created_by_idx on public.warehouse_documents (created_by);
create index warehouse_documents_updated_by_idx on public.warehouse_documents (updated_by);
create index warehouse_documents_deleted_by_idx on public.warehouse_documents (deleted_by);

create trigger set_warehouse_documents_updated_at
  before update on public.warehouse_documents
  for each row
  execute function public.set_updated_at();

alter table public.warehouse_documents enable row level security;

create policy "warehouse_documents_select_viewers"
  on public.warehouse_documents for select
  to authenticated
  using (public.has_permission((select auth.uid()), 'warehouse.view'));

create policy "warehouse_documents_insert_managers"
  on public.warehouse_documents for insert
  to authenticated
  with check (
    public.has_permission((select auth.uid()), 'warehouse.manage')
    or public.has_permission((select auth.uid()), 'warehouse.receive')
    or public.has_permission((select auth.uid()), 'warehouse.dispatch')
    or public.has_permission((select auth.uid()), 'warehouse.transfer')
    or public.has_permission((select auth.uid()), 'warehouse.count')
    or public.has_permission((select auth.uid()), 'warehouse.location.manage')
  );

-- Archival only (deleted_at/deleted_by) — file content itself is immutable once uploaded.
create policy "warehouse_documents_update_managers"
  on public.warehouse_documents for update
  to authenticated
  using (public.has_permission((select auth.uid()), 'warehouse.manage'))
  with check (public.has_permission((select auth.uid()), 'warehouse.manage'));

-- Storage RLS: private bucket, gated the same way as the metadata table. No update/delete
-- policy is granted — matching "no hard deletes", old files are archived via
-- warehouse_documents.deleted_at rather than removed from Storage.
create policy "warehouse_docs_select_viewers"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'warehouse-docs' and public.has_permission((select auth.uid()), 'warehouse.view'));

create policy "warehouse_docs_insert_managers"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'warehouse-docs'
    and (
      public.has_permission((select auth.uid()), 'warehouse.manage')
      or public.has_permission((select auth.uid()), 'warehouse.receive')
      or public.has_permission((select auth.uid()), 'warehouse.dispatch')
      or public.has_permission((select auth.uid()), 'warehouse.transfer')
      or public.has_permission((select auth.uid()), 'warehouse.count')
      or public.has_permission((select auth.uid()), 'warehouse.location.manage')
    )
  );
