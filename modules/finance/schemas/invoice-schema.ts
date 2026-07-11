import { z } from "zod";

export const INVOICE_STATUSES = ["draft", "sent", "paid", "cancelled"] as const;
export const PAYMENT_METHODS = ["cash", "bank_transfer", "mobile_money", "other"] as const;

const invoiceLineItemInputSchema = z.object({
  description: z.string().min(1, "Description is required").max(500),
  quantity: z.coerce.number().positive("Quantity must be greater than zero").default(1),
  unitPrice: z.coerce.number().min(0, "Unit price can't be negative"),
  notes: z.string().max(500).optional(),
});
export type InvoiceLineItemInput = z.infer<typeof invoiceLineItemInputSchema>;

export const createInvoiceSchema = z.object({
  customerId: z.string().uuid("Select a customer"),
  eventId: z.string().uuid().optional(),
  rentalAgreementId: z.string().uuid().optional(),
  currencyCode: z.string().min(1, "Select a currency"),
  issueDate: z.string().min(1, "Issue date is required"),
  dueDate: z.string().optional(),
  notes: z.string().max(2000).optional(),
  lineItems: z.array(invoiceLineItemInputSchema).min(1, "Add at least one line item"),
});
export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;

export const updateInvoiceSchema = z.object({
  dueDate: z.string().optional(),
  notes: z.string().max(2000).optional(),
});
export type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>;

export const setInvoiceStatusSchema = z.object({
  status: z.enum(INVOICE_STATUSES),
});
export type SetInvoiceStatusInput = z.infer<typeof setInvoiceStatusSchema>;

export const recordPaymentSchema = z.object({
  amount: z.coerce.number().positive("Amount must be greater than zero"),
  paidAt: z.string().min(1, "Payment date is required"),
  method: z.enum(PAYMENT_METHODS),
  reference: z.string().max(200).optional(),
  notes: z.string().max(1000).optional(),
});
export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;
