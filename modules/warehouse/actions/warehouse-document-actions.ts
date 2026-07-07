"use server";

import { revalidatePath } from "next/cache";
import { runAction } from "@/modules/warehouse/shared/run-action";
import type { ActionResult } from "@/modules/warehouse/types/action-result";
import { warehouseDocumentService } from "@/modules/warehouse/services/warehouse-document-service";
import type { UploadWarehouseDocumentMetaInput } from "@/modules/warehouse/schemas/warehouse-document-schema";
import type { WarehouseDocumentRow } from "@/modules/warehouse/repositories/warehouse-document-repository";

export async function uploadWarehouseDocumentAction(
  meta: UploadWarehouseDocumentMetaInput,
  file: File
): Promise<ActionResult<WarehouseDocumentRow>> {
  const result = await runAction(() => warehouseDocumentService.uploadDocument(meta, file));
  revalidatePath(`/warehouse/${meta.relatedEntityType}/${meta.relatedEntityId}`);
  return result;
}

export async function archiveWarehouseDocumentAction(
  id: string,
  relatedEntityType: string,
  relatedEntityId: string
): Promise<ActionResult<void>> {
  const result = await runAction(() => warehouseDocumentService.archiveDocument(id, relatedEntityType));
  revalidatePath(`/warehouse/${relatedEntityType}/${relatedEntityId}`);
  return result;
}
