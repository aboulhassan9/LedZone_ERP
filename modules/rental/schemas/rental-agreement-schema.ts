import { z } from "zod";

export const AGREEMENT_STATUSES = ["draft", "active", "completed", "cancelled"] as const;
export const DEPOSIT_STATUSES = ["held", "refunded", "forfeited"] as const;

const lineItemInputSchema = z.object({
  modelId: z.string().uuid("Select a model"),
  quantity: z.coerce.number().positive("Quantity must be greater than zero"),
  dailyRate: z.coerce.number().min(0, "Daily rate can't be negative"),
  notes: z.string().max(500).optional(),
});
export type RentalAgreementLineItemInput = z.infer<typeof lineItemInputSchema>;

export const createRentalAgreementSchema = z
  .object({
    customerId: z.string().uuid("Select a customer"),
    eventId: z.string().uuid().optional(),
    quoteId: z.string().uuid().optional(),
    currencyCode: z.string().min(1, "Select a currency"),
    rentalStartAt: z.string().min(1, "Start is required"),
    rentalEndAt: z.string().min(1, "End is required"),
    depositAmount: z.coerce.number().min(0).default(0),
    notes: z.string().max(2000).optional(),
    lineItems: z.array(lineItemInputSchema).min(1, "Add at least one line item"),
  })
  .refine((v) => new Date(v.rentalEndAt) > new Date(v.rentalStartAt), {
    message: "End must be after start",
    path: ["rentalEndAt"],
  });
export type CreateRentalAgreementInput = z.infer<typeof createRentalAgreementSchema>;

export const updateRentalAgreementSchema = z.object({
  eventId: z.string().uuid().optional(),
  rentalStartAt: z.string().min(1).optional(),
  rentalEndAt: z.string().min(1).optional(),
  depositAmount: z.coerce.number().min(0).optional(),
  notes: z.string().max(2000).optional(),
});
export type UpdateRentalAgreementInput = z.infer<typeof updateRentalAgreementSchema>;

export const setAgreementStatusSchema = z.object({
  status: z.enum(AGREEMENT_STATUSES),
});
export type SetAgreementStatusInput = z.infer<typeof setAgreementStatusSchema>;

export const setDepositStatusSchema = z.object({
  depositStatus: z.enum(DEPOSIT_STATUSES),
});
export type SetDepositStatusInput = z.infer<typeof setDepositStatusSchema>;
