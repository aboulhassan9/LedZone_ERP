import { z } from "zod";

export const EMPLOYMENT_TYPES = ["full_time", "part_time", "contractor"] as const;
export const HR_STATUSES = ["active", "on_leave", "terminated"] as const;

// HR only ever updates the HR-specific columns added in migration 0074 -- employee identity
// (full_name/role/phone/email/is_active) stays Planning's field, created via its own existing
// crew-form-dialog. No create schema here, same reasoning as Fleet's vehicle-schema.
export const updateEmployeeHrInfoSchema = z.object({
  employeeNumber: z.string().max(50).optional(),
  hireDate: z.string().optional(),
  employmentType: z.enum(EMPLOYMENT_TYPES).optional(),
  baseSalary: z.coerce.number().min(0).optional(),
  salaryCurrencyCode: z.string().optional(),
  hrStatus: z.enum(HR_STATUSES).optional(),
  terminationDate: z.string().optional(),
  notes: z.string().max(2000).optional(),
});
export type UpdateEmployeeHrInfoInput = z.infer<typeof updateEmployeeHrInfoSchema>;
