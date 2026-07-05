import { z } from "zod";

export const inviteUserSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email address"),
  fullName: z.string().min(1, "Full name is required"),
  roleId: z.string().uuid("Select a role"),
});

export type InviteUserInput = z.infer<typeof inviteUserSchema>;
