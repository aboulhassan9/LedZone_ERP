import "server-only";
import { assertPermission } from "@/modules/inventory/shared/authorize";
import { logInventoryAudit } from "@/modules/inventory/shared/audit";
import { NotFoundError, ValidationError, toInventoryError } from "@/modules/inventory/errors";
import {
  attachDocumentMetaSchema,
  type AttachDocumentMetaInput,
} from "@/modules/inventory/schemas/attachment-schema";
import {
  attachmentRepository,
  type EquipmentItemAttachmentRow,
} from "@/modules/inventory/repositories/attachment-repository";
import { equipmentItemRepository } from "@/modules/inventory/repositories/equipment-item-repository";

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

// Storage (file bytes) and Postgres (metadata row) are two different systems — there is
// no single transaction spanning both. Upload first, then insert metadata; if the
// metadata insert fails, delete the just-uploaded file so nothing is orphaned.
async function attachDocument(
  meta: AttachDocumentMetaInput,
  file: File
): Promise<EquipmentItemAttachmentRow> {
  const userId = await assertPermission("inventory.manage");
  const parsed = attachDocumentMetaSchema.parse(meta);

  if (!file || file.size === 0) throw new ValidationError("A file is required.");
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new ValidationError(`File exceeds the ${MAX_FILE_SIZE_BYTES / 1024 / 1024}MB limit.`);
  }

  const item = await equipmentItemRepository.findById(parsed.itemId);
  if (!item) throw new NotFoundError("Equipment item");

  const storagePath = attachmentRepository.buildStoragePath(
    parsed.itemId,
    parsed.attachmentType,
    file.name
  );

  await attachmentRepository.uploadFile(storagePath, file);

  try {
    const attachment = await attachmentRepository.insertMetadata({
      itemId: parsed.itemId,
      attachmentType: parsed.attachmentType,
      fileName: file.name,
      storagePath,
      mimeType: file.type || null,
      fileSizeBytes: file.size,
      description: parsed.description,
      userId,
    });
    await logInventoryAudit("equipment_item.document_attached", "equipment_items", parsed.itemId, {
      attachmentType: parsed.attachmentType,
      fileName: file.name,
    });
    return attachment;
  } catch (error) {
    await attachmentRepository.removeFile(storagePath);
    throw toInventoryError(error, "Attachment");
  }
}

async function archiveAttachment(id: string): Promise<void> {
  const userId = await assertPermission("inventory.manage");
  const attachment = await attachmentRepository.archive(id, userId);
  await logInventoryAudit("equipment_item.attachment_archived", "equipment_items", attachment.item_id);
}

export const attachmentService = { attachDocument, archiveAttachment };
