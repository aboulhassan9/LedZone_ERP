-- 0024_storage_bucket_listing_fix: closes a security-advisor finding on the public
-- logos/qr-codes/barcodes buckets (created in Module 1's 0011_storage_buckets.sql).
--
-- For a `public = true` bucket, Supabase serves object bytes via the unauthenticated
-- /storage/v1/object/public/{bucket}/{path} URL regardless of RLS — no SELECT policy is
-- needed for that. The broad `using (bucket_id = 'x')` SELECT policies these buckets had
-- were only adding the ability to LIST every file in the bucket, which nothing in the app
-- needs (every reference is by a specific stored path). Dropping them removes the listing
-- capability while public URL access keeps working exactly as before.

drop policy "logos_public_read" on storage.objects;
drop policy "qr_codes_public_read" on storage.objects;
drop policy "barcodes_public_read" on storage.objects;
