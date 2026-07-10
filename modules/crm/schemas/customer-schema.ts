import { z } from "zod";

export const CUSTOMER_TYPES = ["company", "individual"] as const;
export const LIFECYCLE_STAGES = ["lead", "prospect", "active", "inactive"] as const;
export const CUSTOMER_SOURCES = ["referral", "website", "social", "repeat", "walk_in", "other"] as const;

export const createCustomerSchema = z
  .object({
    customerType: z.enum(CUSTOMER_TYPES).default("company"),
    lifecycleStage: z.enum(LIFECYCLE_STAGES).default("lead"),
    companyName: z.string().max(300).optional(),
    fullName: z.string().max(300).optional(),
    email: z.string().email().max(300).optional(),
    phone: z.string().max(50).optional(),
    billingAddress: z.string().max(1000).optional(),
    taxId: z.string().max(100).optional(),
    source: z.enum(CUSTOMER_SOURCES).optional(),
    assignedTo: z.string().uuid().optional(),
    notes: z.string().max(2000).optional(),
  })
  .refine((v) => (v.customerType === "company" ? !!v.companyName : !!v.fullName), {
    message: "Company name is required for a company, full name for an individual",
    path: ["companyName"],
  });
export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;

export const updateCustomerSchema = z.object({
  lifecycleStage: z.enum(LIFECYCLE_STAGES).optional(),
  companyName: z.string().max(300).optional(),
  fullName: z.string().max(300).optional(),
  email: z.string().email().max(300).optional(),
  phone: z.string().max(50).optional(),
  billingAddress: z.string().max(1000).optional(),
  taxId: z.string().max(100).optional(),
  source: z.enum(CUSTOMER_SOURCES).optional(),
  assignedTo: z.string().uuid().optional(),
  notes: z.string().max(2000).optional(),
});
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;

export const createCustomerContactSchema = z.object({
  fullName: z.string().min(1, "Name is required").max(300),
  role: z.string().max(200).optional(),
  email: z.string().email().max(300).optional(),
  phone: z.string().max(50).optional(),
  isPrimary: z.boolean().default(false),
});
export type CreateCustomerContactInput = z.infer<typeof createCustomerContactSchema>;

export const updateCustomerContactSchema = z.object({
  fullName: z.string().min(1).max(300).optional(),
  role: z.string().max(200).optional(),
  email: z.string().email().max(300).optional(),
  phone: z.string().max(50).optional(),
  isPrimary: z.boolean().optional(),
});
export type UpdateCustomerContactInput = z.infer<typeof updateCustomerContactSchema>;

export const listCustomersSchema = z.object({
  lifecycleStage: z.enum(LIFECYCLE_STAGES).optional(),
});
export type ListCustomersInput = z.infer<typeof listCustomersSchema>;
