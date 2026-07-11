import "server-only";
import { createClient } from "@/lib/supabase/server";
import { STORAGE_BUCKETS } from "@/lib/storage/constants";
import type { DocumentMetadataInput } from "@/modules/documents/schemas/document-schema";

export type DocumentRow = {
  id: string;
  name: string;
  document_type: string;
  entity_type: string | null;
  entity_id: string | null;
  file_path: string;
  file_size: number | null;
  mime_type: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

const DOCUMENT_COLUMNS =
  "id, name, document_type, entity_type, entity_id, file_path, file_size, mime_type, status, notes, created_at, updated_at";

export const documentRepository = {
  async findById(id: string): Promise<DocumentRow | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("documents")
      .select(DOCUMENT_COLUMNS)
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async list(filters: { entityType?: string; entityId?: string }): Promise<DocumentRow[]> {
    const supabase = await createClient();
    let query = supabase.from("documents").select(DOCUMENT_COLUMNS).is("deleted_at", null);
    if (filters.entityType) query = query.eq("entity_type", filters.entityType);
    if (filters.entityId) query = query.eq("entity_id", filters.entityId);
    const { data, error } = await query.order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async uploadFile(path: string, file: File | Uint8Array, contentType?: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.storage
      .from(STORAGE_BUCKETS.documents)
      .upload(path, file, { contentType, upsert: false });
    if (error) throw error;
  },

  async getSignedUrl(path: string): Promise<string> {
    const supabase = await createClient();
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKETS.documents)
      .createSignedUrl(path, 300);
    if (error) throw error;
    return data.signedUrl;
  },

  async create(
    filePath: string,
    input: DocumentMetadataInput,
    fileSize: number | null,
    mimeType: string | null,
    userId: string
  ): Promise<DocumentRow> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("documents")
      .insert({
        name: input.name,
        document_type: input.documentType,
        entity_type: input.entityType ?? null,
        entity_id: input.entityId ?? null,
        file_path: filePath,
        file_size: fileSize,
        mime_type: mimeType,
        notes: input.notes ?? null,
        status: "draft",
        created_by: userId,
        updated_by: userId,
      })
      .select(DOCUMENT_COLUMNS)
      .single();
    if (error) throw error;
    return data;
  },

  async setStatus(id: string, status: string, userId: string): Promise<DocumentRow> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("documents")
      .update({ status, updated_by: userId })
      .eq("id", id)
      .select(DOCUMENT_COLUMNS)
      .single();
    if (error) throw error;
    return data;
  },
};
