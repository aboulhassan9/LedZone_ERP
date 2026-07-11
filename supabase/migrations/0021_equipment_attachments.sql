-- 0021_equipment_attachments: files attached to an item (images, manuals, certificates,
-- warranty documents, purchase invoices, maintenance documents), stored in a new
-- org-wide `equipment-docs` Storage bucket (private — unlike Module 1's per-user `uploads`
-- bucket, these are shared company records gated by inventory permissions, not folder
-- ownership).

insert into storage.buckets (id, name, public) values ('equipment-docs', 'equipment-docs', false)
on conflict (id) do nothing;

create table public.equipment_item_attachments (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.equipment_items (id),
  attachment_type text not null check (
    attachment_type in ('image', 'manual', 'certificate', 'warranty_document', 'purchase_invoice', 'maintenance_document', 'other')
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

comment on table public.equipment_item_attachments is
  'Files attached to an item, stored in the equipment-docs Storage bucket. purchase_invoice attachments require inventory.financials.view to read, same as the financial tables.';

create index equipment_item_attachments_item_id_idx on public.equipment_item_attachments (item_id);
create index equipment_item_attachments_uploaded_by_idx on public.equipment_item_attachments (uploaded_by);
create index equipment_item_attachments_created_by_idx on public.equipment_item_attachments (created_by);
create index equipment_item_attachments_updated_by_idx on public.equipment_item_attachments (updated_by);
create index equipment_item_attachments_deleted_by_idx on public.equipment_item_attachments (deleted_by);

create trigger set_equipment_item_attachments_updated_at
  before update on public.equipment_item_attachments
  for each row
  execute function public.set_updated_at();

alter table public.equipment_item_attachments enable row level security;

create policy "equipment_item_attachments_select_viewers"
  on public.equipment_item_attachments for select
  to authenticated
  using (
    (
      attachment_type <> 'purchase_invoice'
      and public.has_permission((select auth.uid()), 'inventory.view')
    )
    or (
      attachment_type = 'purchase_invoice'
      and public.has_permission((select auth.uid()), 'inventory.financials.view')
    )
  );

create policy "equipment_item_attachments_insert_managers"
  on public.equipment_item_attachments for insert
  to authenticated
  with check (public.has_permission((select auth.uid()), 'inventory.manage'));

create policy "equipment_item_attachments_update_managers"
  on public.equipment_item_attachments for update
  to authenticated
  using (public.has_permission((select auth.uid()), 'inventory.manage'))
  with check (public.has_permission((select auth.uid()), 'inventory.manage'));

create policy "equipment_item_attachments_delete_managers"
  on public.equipment_item_attachments for delete
  to authenticated
  using (public.has_permission((select auth.uid()), 'inventory.manage'));

-- Storage-level RLS mirrors the table-level policy above (defense in depth: the file
-- bytes are gated the same way the metadata row is, not just the metadata itself).
-- Requires the app to always upload to the path convention `{item_id}/{attachment_type}/{filename}`
-- so the purchase_invoice sensitivity check can be enforced on the object path itself.
create policy "equipment_docs_select_viewers"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'equipment-docs'
    and (
      (
        (storage.foldername(name))[2] is distinct from 'purchase_invoice'
        and public.has_permission((select auth.uid()), 'inventory.view')
      )
      or (
        (storage.foldername(name))[2] = 'purchase_invoice'
        and public.has_permission((select auth.uid()), 'inventory.financials.view')
      )
    )
  );

create policy "equipment_docs_insert_managers"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'equipment-docs'
    and public.has_permission((select auth.uid()), 'inventory.manage')
  );

create policy "equipment_docs_update_managers"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'equipment-docs'
    and public.has_permission((select auth.uid()), 'inventory.manage')
  );

create policy "equipment_docs_delete_managers"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'equipment-docs'
    and public.has_permission((select auth.uid()), 'inventory.manage')
  );
