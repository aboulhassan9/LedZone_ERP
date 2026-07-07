import "server-only";
import { assertAnyPermission } from "@/modules/warehouse/shared/authorize";
import { logWarehouseAudit } from "@/modules/warehouse/shared/audit";
import { ValidationError, toWarehouseError } from "@/modules/warehouse/errors";
import {
  uploadWarehouseDocumentMetaSchema,
  type UploadWarehouseDocumentMetaInput,
} from "@/modules/warehouse/schemas/warehouse-document-schema";
import {
  warehouseDocumentRepository,
  type WarehouseDocumentRow,
} from "@/modules/warehouse/repositories/warehouse-document-repository";

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB, same limit as Inventory attachments

const PERMISSIONS_BY_ENTITY: Record<string, string[]> = {
  transfer: ["warehouse.manage", "warehouse.transfer"],
  receiving: ["warehouse.manage", "warehouse.receive"],
  dispatch: ["warehouse.manage", "warehouse.dispatch"],
  cycle_count: ["warehouse.manage", "warehouse.count"],
  warehouse_location: ["warehouse.manage", "warehouse.location.manage"],
};

// Storage (file bytes) and Postgres (metadata row) are two different systems — upload
// first, then insert metadata; roll back the orphaned file if the metadata insert fails.
// Mirrors modules/inventory/services/attachment-service.ts exactly.
async function uploadDocument(
  meta: UploadWarehouseDocumentMetaInput,
  file: File
): Promise<WarehouseDocumentRow> {
  const parsed = uploadWarehouseDocumentMetaSchema.parse(meta);
  const userId = await assertAnyPermission(PERMISSIONS_BY_ENTITY[parsed.relatedEntityType]);

  if (!file || file.size === 0) throw new ValidationError("A file is required.");
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new ValidationError(`File exceeds the ${MAX_FILE_SIZE_BYTES / 1024 / 1024}MB limit.`);
  }

  const storagePath = warehouseDocumentRepository.buildStoragePath(
    parsed.relatedEntityType,
    parsed.relatedEntityId,
    file.name
  );

  await warehouseDocumentRepository.uploadFile(storagePath, file);

  try {
    const document = await warehouseDocumentRepository.insertMetadata({
      relatedEntityType: parsed.relatedEntityType,
      relatedEntityId: parsed.relatedEntityId,
      documentType: parsed.documentType,
      fileName: file.name,
      storagePath,
      mimeType: file.type || null,
      fileSizeBytes: file.size,
      description: parsed.description,
      userId,
    });
    await logWarehouseAudit("warehouse_document.uploaded", parsed.relatedEntityType, parsed.relatedEntityId, {
      documentType: parsed.documentType,
      fileName: file.name,
    });
    return document;
  } catch (error) {
    await warehouseDocumentRepository.removeFile(storagePath);
    throw toWarehouseError(error, "Document");
  }
}

async function listDocumentsFor(
  relatedEntityType: string,
  relatedEntityId: string
): Promise<WarehouseDocumentRow[]> {
  return warehouseDocumentRepository.findByRelatedEntity(relatedEntityType, relatedEntityId);
}

async function archiveDocument(id: string, relatedEntityType: string): Promise<void> {
  const userId = await assertAnyPermission(
    PERMISSIONS_BY_ENTITY[relatedEntityType] ?? ["warehouse.manage"]
  );
  const document = await warehouseDocumentRepository.archive(id, userId);
  await logWarehouseAudit(
    "warehouse_document.archived",
    document.related_entity_type,
    document.related_entity_id
  );
}

export const warehouseDocumentService = { uploadDocument, listDocumentsFor, archiveDocument };
