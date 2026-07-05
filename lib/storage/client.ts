"use client";

import { createClient } from "@/lib/supabase/client";
import { STORAGE_BUCKETS } from "@/lib/storage/constants";

// Personal files live under uploads/{user_id}/... — storage RLS (0011_storage_buckets.sql)
// only lets a user read/write within their own folder.
export async function uploadOwnFile(userId: string, file: File) {
  const supabase = createClient();
  const path = `${userId}/${Date.now()}-${file.name}`;

  const { error } = await supabase.storage.from(STORAGE_BUCKETS.uploads).upload(path, file);
  if (error) throw error;

  return path;
}

export async function listOwnFiles(userId: string) {
  const supabase = createClient();
  const { data, error } = await supabase.storage.from(STORAGE_BUCKETS.uploads).list(userId, {
    sortBy: { column: "created_at", order: "desc" },
  });
  if (error) throw error;

  return data;
}

export async function removeOwnFile(userId: string, fileName: string) {
  const supabase = createClient();
  const { error } = await supabase.storage
    .from(STORAGE_BUCKETS.uploads)
    .remove([`${userId}/${fileName}`]);
  if (error) throw error;
}

export async function getOwnFileSignedUrl(userId: string, fileName: string) {
  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKETS.uploads)
    .createSignedUrl(`${userId}/${fileName}`, 60);
  if (error) throw error;

  return data.signedUrl;
}
