import { z } from "zod";

export const registerPurchaseSchema = z.object({
  supplierId: z.string().uuid("Select a supplier"),
  purchaseDate: z.string().date().optional(),
  invoiceNumber: z.string().max(200).optional(),
  currencyCode: z.string().length(3, "Select a currency"),
  exchangeRateId: z.string().uuid().optional(),
  subtotalAmount: z.number().nonnegative().optional(),
  taxAmount: z.number().nonnegative().optional(),
  totalAmount: z.number().nonnegative(),
  status: z.enum(["ordered", "received", "cancelled"]).default("ordered"),
  notes: z.string().max(2000).optional(),
});
export type RegisterPurchaseInput = z.infer<typeof registerPurchaseSchema>;

export const updatePurchaseSchema = registerPurchaseSchema.partial();
export type UpdatePurchaseInput = z.infer<typeof updatePurchaseSchema>;
