import "server-only";
import { createClient } from "@/lib/supabase/server";

export type EquipmentItemAttachmentRow = {
  id: string;
  item_id: string;
  attachment_type: string;
  file_name: string;
  storage_path: string;
  mime_type: string | null;
  file_size_bytes: number | null;
  description: string | null;
};

const BUCKET = "equipment-docs";
const COLUMNS =
  "id, item_id, attachment_type, file_name, storage_path, mime_type, file_size_bytes, description";

export const attachmentRepository = {
  // Path convention `{item_id}/{attachment_type}/{filename}` — required by the Storage
  // RLS policy in 0021_equipment_attachments.sql, which inspects this path to decide
  // whether inventory.financials.view (not just inventory.view) is required to read it.
  buildStoragePath(itemId: string, attachmentType: string, fileName: string): string {
    return `${itemId}/${attachmentType}/${Date.now()}-${fileName}`;
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
    itemId: string;
    attachmentType: string;
    fileName: string;
    storagePath: string;
    mimeType: string | null;
    fileSizeBytes: number | null;
    description?: string;
    userId: string;
  }): Promise<EquipmentItemAttachmentRow> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("equipment_item_attachments")
      .insert({
        item_id: input.itemId,
        attachment_type: input.attachmentType,
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

  async archive(id: string, userId: string): Promise<EquipmentItemAttachmentRow> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("equipment_item_attachments")
      .update({ deleted_at: new Date().toISOString(), deleted_by: userId })
      .eq("id", id)
      .select(COLUMNS)
      .single();
    if (error) throw error;
    return data;
  },
};
