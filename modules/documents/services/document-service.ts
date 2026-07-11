import "server-only";
import { generateSimplePdf, type PdfSection } from "@/lib/services/pdf-generator";
import { formatMoney } from "@/lib/currency";
import { assertPermission } from "@/modules/documents/shared/authorize";
import { logDocumentsAudit } from "@/modules/documents/shared/audit";
import { ConflictError, NotFoundError, ValidationError, toDocumentsError } from "@/modules/documents/errors";
import {
  documentMetadataSchema,
  setDocumentStatusSchema,
  generateDocumentFromEntitySchema,
  type DocumentMetadataInput,
  type SetDocumentStatusInput,
  type GenerateDocumentFromEntityInput,
} from "@/modules/documents/schemas/document-schema";
import { addSignatureSchema, type AddSignatureInput } from "@/modules/documents/schemas/signature-schema";
import { documentRepository, type DocumentRow } from "@/modules/documents/repositories/document-repository";
import {
  signatureRepository,
  type DocumentSignatureRow,
} from "@/modules/documents/repositories/signature-repository";
import { quoteRepository } from "@/modules/crm/repositories/quote-repository";
import { rentalAgreementRepository } from "@/modules/rental/repositories/rental-agreement-repository";
import { invoiceRepository } from "@/modules/finance/repositories/invoice-repository";

// A document's status is a straightforward record-keeping pipeline, not a physical-state
// machine -- same proportionate-scope decision made throughout this codebase's other status
// pipelines. "signed" here means at least one document_signatures row exists, recorded by
// addSignature -- this module never verifies identity or cryptographically signs anything.
const TRANSITIONS: Record<string, string[]> = {
  draft: ["pending_signature", "archived"],
  pending_signature: ["signed", "archived"],
  signed: ["archived"],
  archived: [],
};

async function requireDocument(id: string): Promise<DocumentRow> {
  const document = await documentRepository.findById(id);
  if (!document) throw new NotFoundError("Document");
  return document;
}

// The file itself is uploaded client-side directly to Supabase Storage (same pattern
// modules/settings/components/file-manager.tsx already uses for personal uploads) -- this
// only records the metadata row for a path the client has already written, storage RLS having
// already checked documents.manage on the upload itself.
async function recordUploadedDocument(
  filePath: string,
  fileSize: number,
  mimeType: string | null,
  input: DocumentMetadataInput
): Promise<DocumentRow> {
  const userId = await assertPermission("documents.manage");
  const parsed = documentMetadataSchema.parse(input);

  if (fileSize === 0) throw new ValidationError("The selected file is empty.");

  try {
    const document = await documentRepository.create(filePath, parsed, fileSize, mimeType, userId);
    await logDocumentsAudit("document.uploaded", "documents", document.id, {
      documentType: parsed.documentType,
    });
    return document;
  } catch (error) {
    throw toDocumentsError(error, "Document");
  }
}

async function generateDocumentFromEntity(
  input: GenerateDocumentFromEntityInput
): Promise<DocumentRow> {
  const userId = await assertPermission("documents.manage");
  const parsed = generateDocumentFromEntitySchema.parse(input);

  const { title, name, sections } = await buildPdfContent(parsed.entityType, parsed.entityId);
  const pdfBytes = await generateSimplePdf(title, sections);
  const path = `${parsed.entityType}/${Date.now()}-${name}.pdf`;

  try {
    await documentRepository.uploadFile(path, pdfBytes, "application/pdf");
    const document = await documentRepository.create(
      path,
      { name, documentType: parsed.entityType, entityType: parsed.entityType, entityId: parsed.entityId },
      pdfBytes.byteLength,
      "application/pdf",
      userId
    );
    await logDocumentsAudit("document.generated", "documents", document.id, {
      entityType: parsed.entityType,
      entityId: parsed.entityId,
    });
    return document;
  } catch (error) {
    throw toDocumentsError(error, "Document");
  }
}

async function buildPdfContent(
  entityType: GenerateDocumentFromEntityInput["entityType"],
  entityId: string
): Promise<{ title: string; name: string; sections: PdfSection[] }> {
  if (entityType === "quote") {
    const quote = await quoteRepository.findById(entityId);
    if (!quote) throw new NotFoundError("Quote");
    const lineItems = await quoteRepository.findLineItems(entityId);
    const total = lineItems.reduce((sum, li) => sum + li.quantity * li.unit_price, 0);
    return {
      title: `Quote ${quote.quote_number}`,
      name: quote.quote_number,
      sections: [
        { heading: "Details", lines: [`Status: ${quote.status}`, `Currency: ${quote.currency_code}`] },
        {
          heading: "Line items",
          lines: lineItems.map(
            (li) => `${li.quantity} x model ${li.model_id} @ ${formatMoney(li.unit_price, quote.currency_code)}`
          ),
        },
        { heading: "Total", lines: [formatMoney(total, quote.currency_code)] },
      ],
    };
  }

  if (entityType === "rental_agreement") {
    const agreement = await rentalAgreementRepository.findById(entityId);
    if (!agreement) throw new NotFoundError("Rental agreement");
    const lineItems = await rentalAgreementRepository.findLineItems(entityId);
    return {
      title: `Rental Agreement ${agreement.agreement_number}`,
      name: agreement.agreement_number,
      sections: [
        {
          heading: "Details",
          lines: [
            `Status: ${agreement.status}`,
            `Currency: ${agreement.currency_code}`,
            `Window: ${agreement.rental_start_at} to ${agreement.rental_end_at}`,
            `Deposit: ${formatMoney(agreement.deposit_amount, agreement.currency_code)} (${agreement.deposit_status})`,
          ],
        },
        {
          heading: "Line items",
          lines: lineItems.map(
            (li) => `${li.quantity} x model ${li.model_id} @ ${formatMoney(li.daily_rate, agreement.currency_code)}/day`
          ),
        },
      ],
    };
  }

  const invoice = await invoiceRepository.findById(entityId);
  if (!invoice) throw new NotFoundError("Invoice");
  const lineItems = await invoiceRepository.findLineItems(entityId);
  const total = lineItems.reduce((sum, li) => sum + li.quantity * li.unit_price, 0);
  return {
    title: `Invoice ${invoice.invoice_number}`,
    name: invoice.invoice_number,
    sections: [
      { heading: "Details", lines: [`Status: ${invoice.status}`, `Currency: ${invoice.currency_code}`] },
      {
        heading: "Line items",
        lines: lineItems.map(
          (li) => `${li.quantity} x ${li.description} @ ${formatMoney(li.unit_price, invoice.currency_code)}`
        ),
      },
      { heading: "Total", lines: [formatMoney(total, invoice.currency_code)] },
    ],
  };
}

async function getDocument(
  id: string
): Promise<{ document: DocumentRow; downloadUrl: string; signatures: DocumentSignatureRow[] }> {
  await assertPermission("documents.view");
  const document = await requireDocument(id);
  const [downloadUrl, signatures] = await Promise.all([
    documentRepository.getSignedUrl(document.file_path),
    signatureRepository.findByDocument(id),
  ]);
  return { document, downloadUrl, signatures };
}

async function listDocuments(filters: { entityType?: string; entityId?: string }): Promise<DocumentRow[]> {
  await assertPermission("documents.view");
  return documentRepository.list(filters);
}

async function setDocumentStatus(id: string, input: SetDocumentStatusInput): Promise<DocumentRow> {
  const userId = await assertPermission("documents.manage");
  const parsed = setDocumentStatusSchema.parse(input);
  const document = await requireDocument(id);

  if (!TRANSITIONS[document.status]?.includes(parsed.status)) {
    throw new ConflictError(`Cannot move a "${document.status}" document to "${parsed.status}".`);
  }

  try {
    const updated = await documentRepository.setStatus(id, parsed.status, userId);
    await logDocumentsAudit(`document.${parsed.status}`, "documents", id);
    return updated;
  } catch (error) {
    throw toDocumentsError(error, "Document");
  }
}

async function addSignature(documentId: string, input: AddSignatureInput): Promise<DocumentSignatureRow> {
  const userId = await assertPermission("documents.manage");
  const parsed = addSignatureSchema.parse(input);
  const document = await requireDocument(documentId);

  if (document.status === "archived") {
    throw new ConflictError("Cannot sign an archived document.");
  }

  try {
    const signature = await signatureRepository.create(documentId, parsed, userId);
    if (document.status !== "signed") {
      await documentRepository.setStatus(documentId, "signed", userId);
    }
    await logDocumentsAudit("document.signed", "documents", documentId, { signerName: parsed.signerName });
    return signature;
  } catch (error) {
    throw toDocumentsError(error, "Signature");
  }
}

export const documentService = {
  recordUploadedDocument,
  generateDocumentFromEntity,
  getDocument,
  listDocuments,
  setDocumentStatus,
  addSignature,
};
