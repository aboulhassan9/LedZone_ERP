"use client";

import { createClient } from "@/lib/supabase/client";
import { STORAGE_BUCKETS } from "@/lib/storage/constants";

// Mirrors lib/storage/client.ts's uploadOwnFile -- the file goes straight from the browser to
// Supabase Storage, gated by the documents bucket's own RLS (documents.manage), same as the
// existing personal-uploads flow. The Server Action only ever records metadata for a path that
// already exists.
export async function uploadDocumentFile(
  documentType: string,
  file: File
): Promise<{ path: string; size: number; type: string | null }> {
  const supabase = createClient();
  const path = `${documentType}/${Date.now()}-${file.name}`;

  const { error } = await supabase.storage
    .from(STORAGE_BUCKETS.documents)
    .upload(path, file, { contentType: file.type || undefined });
  if (error) throw error;

  return { path, size: file.size, type: file.type || null };
}
