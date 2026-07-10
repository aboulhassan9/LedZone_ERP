import { z } from "zod";

export const QUOTE_STATUSES = ["draft", "sent", "accepted", "rejected", "expired"] as const;

const quoteLineItemInputSchema = z.object({
  modelId: z.string().uuid("Select a model"),
  quantity: z.coerce.number().positive("Quantity must be greater than zero"),
  unitPrice: z.coerce.number().min(0, "Unit price can't be negative"),
  notes: z.string().max(500).optional(),
});
export type QuoteLineItemInput = z.infer<typeof quoteLineItemInputSchema>;

export const createQuoteSchema = z.object({
  customerId: z.string().uuid("Select a customer"),
  currencyCode: z.string().min(1, "Select a currency"),
  validUntil: z.string().optional(),
  eventReference: z.string().max(300).optional(),
  notes: z.string().max(2000).optional(),
  lineItems: z.array(quoteLineItemInputSchema).min(1, "Add at least one line item"),
});
export type CreateQuoteInput = z.infer<typeof createQuoteSchema>;

export const updateQuoteSchema = z.object({
  validUntil: z.string().optional(),
  eventReference: z.string().max(300).optional(),
  notes: z.string().max(2000).optional(),
});
export type UpdateQuoteInput = z.infer<typeof updateQuoteSchema>;

export const setQuoteStatusSchema = z.object({
  status: z.enum(QUOTE_STATUSES),
});
export type SetQuoteStatusInput = z.infer<typeof setQuoteStatusSchema>;
