import { z } from "zod";

export const addSignatureSchema = z.object({
  signerName: z.string().min(1, "Signer name is required").max(300),
  signerEmail: z.string().email().max(300).optional(),
  notes: z.string().max(500).optional(),
});
export type AddSignatureInput = z.infer<typeof addSignatureSchema>;
