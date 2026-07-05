-- 0011_storage_buckets: the four Supabase Storage buckets from the architecture doc.
-- Vercel's serverless filesystem is ephemeral/read-only at runtime, so anything generated
-- or uploaded after build time (logos edited in-app, user uploads, future QR/barcode
-- images) must live in Storage, never in the Next.js public/ folder.

insert into storage.buckets (id, name, public) values
  ('logos', 'logos', true),
  ('uploads', 'uploads', false),
  ('qr-codes', 'qr-codes', true),
  ('barcodes', 'barcodes', true)
on conflict (id) do nothing;

-- logos: publicly readable (used in the UI), editable only by company.manage.
create policy "logos_public_read"
  on storage.objects for select
  using (bucket_id = 'logos');

create policy "logos_managers_insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'logos' and public.has_permission((select auth.uid()), 'company.manage'));

create policy "logos_managers_update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'logos' and public.has_permission((select auth.uid()), 'company.manage'));

create policy "logos_managers_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'logos' and public.has_permission((select auth.uid()), 'company.manage'));

-- uploads: private. Each user reads/writes only their own uploads/{user_id}/... folder.
create policy "uploads_own_folder_select"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'uploads' and (select auth.uid())::text = (storage.foldername(name))[1]);

create policy "uploads_own_folder_insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'uploads' and (select auth.uid())::text = (storage.foldername(name))[1]);

create policy "uploads_own_folder_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'uploads' and (select auth.uid())::text = (storage.foldername(name))[1]);

-- qr-codes / barcodes: publicly readable once the future Inventory module generates
-- them. No authenticated write policy yet — populated server-side via the service-role
-- client (lib/services/qr-generator, lib/services/barcode-generator), which bypasses RLS.
create policy "qr_codes_public_read"
  on storage.objects for select
  using (bucket_id = 'qr-codes');

create policy "barcodes_public_read"
  on storage.objects for select
  using (bucket_id = 'barcodes');
