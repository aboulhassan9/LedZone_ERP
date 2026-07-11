-- 0077_documents: Module 11 (Documents). Document generation/storage and a lightweight
-- internal signature-tracking workflow on top of the existing `documents` storage bucket
-- (added here) and lib/services/pdf-generator's generateSimplePdf. `entity_type`/`entity_id`
-- are a deliberate polymorphic reference (no FK) -- a document can attach to a quote, rental
-- agreement, invoice, event, or customer, and a real FK can't span multiple target tables.
-- This is NOT a legally-binding e-signature platform (no cryptographic signing, no external
-- notary/audit-trail service) -- it's an internal record of "who typed their name, when",
-- proportionate to an internal ERP's needs, same scope-discipline applied to every other
-- module here (e.g. Finance deliberately not being a double-entry ledger).

insert into storage.buckets (id, name, public) values
  ('documents', 'documents', false)
on conflict (id) do nothing;

create policy "documents_bucket_select_viewers"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'documents' and public.has_permission((select auth.uid()), 'documents.view'));

create policy "documents_bucket_insert_managers"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'documents' and public.has_permission((select auth.uid()), 'documents.manage'));

create policy "documents_bucket_delete_managers"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'documents' and public.has_permission((select auth.uid()), 'documents.manage'));

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  document_type text not null check (
    document_type in ('quote', 'rental_agreement', 'invoice', 'contract', 'other')
  ),
  entity_type text,
  entity_id uuid,
  file_path text not null,
  file_size bigint,
  mime_type text,
  status text not null default 'draft' check (
    status in ('draft', 'pending_signature', 'signed', 'archived')
  ),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id),
  updated_by uuid references public.profiles (id),
  deleted_at timestamptz,
  deleted_by uuid references public.profiles (id)
);

comment on table public.documents is
  'A generated or uploaded file, optionally attached to another entity via entity_type/entity_id (polymorphic, no FK -- can point at a quote, rental agreement, invoice, event, or customer). file_path is the storage.objects key in the documents bucket.';

create index documents_entity_idx on public.documents (entity_type, entity_id);
create index documents_document_type_idx on public.documents (document_type);
create index documents_status_idx on public.documents (status);
create index documents_created_by_idx on public.documents (created_by);
create index documents_updated_by_idx on public.documents (updated_by);
create index documents_deleted_by_idx on public.documents (deleted_by);

create trigger set_documents_updated_at
  before update on public.documents
  for each row
  execute function public.set_updated_at();

create table public.document_signatures (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents (id),
  signer_name text not null,
  signer_email text,
  signed_at timestamptz not null default now(),
  notes text,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles (id)
);

comment on table public.document_signatures is
  'An internal record of "who typed their name, when" against a document -- not a cryptographic or legally-binding e-signature.';

create index document_signatures_document_id_idx on public.document_signatures (document_id);
create index document_signatures_created_by_idx on public.document_signatures (created_by);

alter table public.documents enable row level security;
alter table public.document_signatures enable row level security;

create policy "documents_select_viewers"
  on public.documents for select
  to authenticated
  using (public.has_permission((select auth.uid()), 'documents.view'));

create policy "documents_insert_managers"
  on public.documents for insert
  to authenticated
  with check (public.has_permission((select auth.uid()), 'documents.manage'));

create policy "documents_update_managers"
  on public.documents for update
  to authenticated
  using (public.has_permission((select auth.uid()), 'documents.manage'))
  with check (public.has_permission((select auth.uid()), 'documents.manage'));

create policy "document_signatures_select_viewers"
  on public.document_signatures for select
  to authenticated
  using (public.has_permission((select auth.uid()), 'documents.view'));

create policy "document_signatures_insert_managers"
  on public.document_signatures for insert
  to authenticated
  with check (public.has_permission((select auth.uid()), 'documents.manage'));
