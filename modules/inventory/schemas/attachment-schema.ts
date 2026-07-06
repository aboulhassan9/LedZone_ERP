import { z } from "zod";

export const ATTACHMENT_TYPES = [
  "image",
  "manual",
  "certificate",
  "warranty_document",
  "purchase_invoice",
  "maintenance_document",
  "other",
] as const;

// File itself isn't part of the Zod schema — File/Blob validation happens in the service,
// since Zod isn't the right tool for binary payload checks (size/mime type).
export const attachDocumentMetaSchema = z.object({
  itemId: z.string().uuid("Select an item"),
  attachmentType: z.enum(ATTACHMENT_TYPES),
  description: z.string().max(1000).optional(),
});
export type AttachDocumentMetaInput = z.infer<typeof attachDocumentMetaSchema>;
