import "server-only";
import { createClient } from "@/lib/supabase/server";
import { STORAGE_BUCKETS } from "@/lib/storage/constants";

// Company branding assets. Callers must check 'company.manage' themselves before calling
// this — storage RLS enforces it too, but Server Actions should fail fast with a clear error.
export async function uploadCompanyLogo(file: File) {
  const supabase = await createClient();
  const path = `company/${Date.now()}-${file.name}`;

  const { error } = await supabase.storage
    .from(STORAGE_BUCKETS.logos)
    .upload(path, file, { upsert: true });
  if (error) throw error;

  return supabase.storage.from(STORAGE_BUCKETS.logos).getPublicUrl(path).data.publicUrl;
}
