import { z } from "zod";

export const DOCUMENT_TYPES = ["quote", "rental_agreement", "invoice", "contract", "other"] as const;
export const DOCUMENT_STATUSES = ["draft", "pending_signature", "signed", "archived"] as const;
export const ENTITY_TYPES = ["quote", "rental_agreement", "invoice", "event", "customer"] as const;

export const documentMetadataSchema = z.object({
  name: z.string().min(1, "Name is required").max(300),
  documentType: z.enum(DOCUMENT_TYPES),
  entityType: z.enum(ENTITY_TYPES).optional(),
  entityId: z.string().uuid().optional(),
  notes: z.string().max(1000).optional(),
});
export type DocumentMetadataInput = z.infer<typeof documentMetadataSchema>;

export const setDocumentStatusSchema = z.object({
  status: z.enum(DOCUMENT_STATUSES),
});
export type SetDocumentStatusInput = z.infer<typeof setDocumentStatusSchema>;

export const generateDocumentFromEntitySchema = z.object({
  entityType: z.enum(["quote", "rental_agreement", "invoice"]),
  entityId: z.string().uuid(),
});
export type GenerateDocumentFromEntityInput = z.infer<typeof generateDocumentFromEntitySchema>;
