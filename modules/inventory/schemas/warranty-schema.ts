import { z } from "zod";

export const registerWarrantySchema = z
  .object({
    itemId: z.string().uuid("Select an item"),
    purchaseId: z.string().uuid().optional(),
    providerType: z.enum(["manufacturer", "supplier", "third_party"]),
    providerName: z.string().max(200).optional(),
    warrantyType: z.string().max(100).optional(),
    startDate: z.string().date(),
    endDate: z.string().date(),
    terms: z.string().max(2000).optional(),
    claimContact: z.string().max(300).optional(),
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: "End date must be on or after the start date.",
    path: ["endDate"],
  });
export type RegisterWarrantyInput = z.infer<typeof registerWarrantySchema>;

export const updateWarrantySchema = z.object({
  providerName: z.string().max(200).optional(),
  warrantyType: z.string().max(100).optional(),
  terms: z.string().max(2000).optional(),
  claimContact: z.string().max(300).optional(),
  status: z.enum(["active", "expired", "voided", "claimed"]).optional(),
});
export type UpdateWarrantyInput = z.infer<typeof updateWarrantySchema>;
