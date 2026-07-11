import { z } from "zod";

export const DOCUMENT_RELATED_ENTITY_TYPES = [
  "transfer",
  "receiving",
  "dispatch",
  "cycle_count",
  "warehouse_location",
] as const;

export const DOCUMENT_TYPES = [
  "photo",
  "inspection_form",
  "damage_report",
  "transfer_document",
  "packing_list",
  "delivery_note",
  "signature",
  "other",
] as const;

// File itself isn't part of the Zod schema (binary payload validation happens in the
// service), same convention as modules/inventory/schemas/attachment-schema.ts.
export const uploadWarehouseDocumentMetaSchema = z.object({
  relatedEntityType: z.enum(DOCUMENT_RELATED_ENTITY_TYPES),
  relatedEntityId: z.string().uuid(),
  documentType: z.enum(DOCUMENT_TYPES),
  description: z.string().max(1000).optional(),
});
export type UploadWarehouseDocumentMetaInput = z.infer<typeof uploadWarehouseDocumentMetaSchema>;
