import "server-only";
import { createClient } from "@/lib/supabase/server";

export type WarehouseDocumentRow = {
  id: string;
  related_entity_type: string;
  related_entity_id: string;
  document_type: string;
  file_name: string;
  storage_path: string;
  mime_type: string | null;
  file_size_bytes: number | null;
  uploaded_by: string | null;
  description: string | null;
};

const BUCKET = "warehouse-docs";
const COLUMNS =
  "id, related_entity_type, related_entity_id, document_type, file_name, storage_path, mime_type, file_size_bytes, uploaded_by, description";

export const warehouseDocumentRepository = {
  // Path convention `{related_entity_type}/{related_entity_id}/{filename}`, mirroring the
  // equipment-docs convention from modules/inventory/repositories/attachment-repository.ts.
  buildStoragePath(relatedEntityType: string, relatedEntityId: string, fileName: string): string {
    return `${relatedEntityType}/${relatedEntityId}/${Date.now()}-${fileName}`;
  },

  async uploadFile(path: string, file: File): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
      contentType: file.type || undefined,
    });
    if (error) throw error;
  },

  async removeFile(path: string): Promise<void> {
    const supabase = await createClient();
    await supabase.storage.from(BUCKET).remove([path]);
  },

  async insertMetadata(input: {
    relatedEntityType: string;
    relatedEntityId: string;
    documentType: string;
    fileName: string;
    storagePath: string;
    mimeType: string | null;
    fileSizeBytes: number | null;
    description?: string;
    userId: string;
  }): Promise<WarehouseDocumentRow> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("warehouse_documents")
      .insert({
        related_entity_type: input.relatedEntityType,
        related_entity_id: input.relatedEntityId,
        document_type: input.documentType,
        file_name: input.fileName,
        storage_path: input.storagePath,
        mime_type: input.mimeType,
        file_size_bytes: input.fileSizeBytes,
        uploaded_by: input.userId,
        description: input.description,
        created_by: input.userId,
        updated_by: input.userId,
      })
      .select(COLUMNS)
      .single();
    if (error) throw error;
    return data;
  },

  async findByRelatedEntity(
    relatedEntityType: string,
    relatedEntityId: string
  ): Promise<WarehouseDocumentRow[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("warehouse_documents")
      .select(COLUMNS)
      .eq("related_entity_type", relatedEntityType)
      .eq("related_entity_id", relatedEntityId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async archive(id: string, userId: string): Promise<WarehouseDocumentRow> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("warehouse_documents")
      .update({ deleted_at: new Date().toISOString(), deleted_by: userId })
      .eq("id", id)
      .select(COLUMNS)
      .single();
    if (error) throw error;
    return data;
  },
};
