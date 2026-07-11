"use server";

import { revalidatePath } from "next/cache";
import { runAction } from "@/modules/documents/shared/run-action";
import type { ActionResult } from "@/modules/warehouse/types/action-result";
import { documentService } from "@/modules/documents/services/document-service";
import type {
  DocumentMetadataInput,
  SetDocumentStatusInput,
  GenerateDocumentFromEntityInput,
} from "@/modules/documents/schemas/document-schema";
import type { AddSignatureInput } from "@/modules/documents/schemas/signature-schema";
import type { DocumentRow } from "@/modules/documents/repositories/document-repository";
import type { DocumentSignatureRow } from "@/modules/documents/repositories/signature-repository";

function revalidateDocuments(id?: string) {
  revalidatePath("/documents");
  if (id) revalidatePath(`/documents/${id}`);
}

export async function recordUploadedDocumentAction(
  filePath: string,
  fileSize: number,
  mimeType: string | null,
  input: DocumentMetadataInput
): Promise<ActionResult<DocumentRow>> {
  const result = await runAction(() =>
    documentService.recordUploadedDocument(filePath, fileSize, mimeType, input)
  );
  revalidateDocuments();
  return result;
}

export async function generateDocumentFromEntityAction(
  input: GenerateDocumentFromEntityInput
): Promise<ActionResult<DocumentRow>> {
  const result = await runAction(() => documentService.generateDocumentFromEntity(input));
  revalidateDocuments();
  return result;
}

export async function getDocumentAction(id: string): Promise<
  ActionResult<{ document: DocumentRow; downloadUrl: string; signatures: DocumentSignatureRow[] }>
> {
  return runAction(() => documentService.getDocument(id));
}

export async function listDocumentsAction(filters: {
  entityType?: string;
  entityId?: string;
}): Promise<ActionResult<DocumentRow[]>> {
  return runAction(() => documentService.listDocuments(filters));
}

export async function setDocumentStatusAction(
  id: string,
  input: SetDocumentStatusInput
): Promise<ActionResult<DocumentRow>> {
  const result = await runAction(() => documentService.setDocumentStatus(id, input));
  revalidateDocuments(id);
  return result;
}

export async function addSignatureAction(
  documentId: string,
  input: AddSignatureInput
): Promise<ActionResult<DocumentSignatureRow>> {
  const result = await runAction(() => documentService.addSignature(documentId, input));
  revalidateDocuments(documentId);
  return result;
}
