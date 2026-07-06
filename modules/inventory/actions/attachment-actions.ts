"use server";

import { revalidatePath } from "next/cache";
import { runAction } from "@/modules/inventory/shared/run-action";
import type { ActionResult } from "@/modules/inventory/types/action-result";
import { attachmentService } from "@/modules/inventory/services/attachment-service";
import type { AttachDocumentMetaInput } from "@/modules/inventory/schemas/attachment-schema";
import type { EquipmentItemAttachmentRow } from "@/modules/inventory/repositories/attachment-repository";

export async function attachDocumentAction(
  meta: AttachDocumentMetaInput,
  file: File
): Promise<ActionResult<EquipmentItemAttachmentRow>> {
  const result = await runAction(() => attachmentService.attachDocument(meta, file));
  revalidatePath(`/inventory/items/${meta.itemId}`);
  return result;
}

export async function archiveAttachmentAction(
  id: string,
  itemId: string
): Promise<ActionResult<void>> {
  const result = await runAction(() => attachmentService.archiveAttachment(id));
  revalidatePath(`/inventory/items/${itemId}`);
  return result;
}
