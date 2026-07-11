import { z } from "zod";

export const createCrewMemberSchema = z.object({
  fullName: z.string().min(1, "Name is required").max(300),
  role: z.string().max(200).optional(),
  phone: z.string().max(50).optional(),
  email: z.string().email().max(300).optional(),
});
export type CreateCrewMemberInput = z.infer<typeof createCrewMemberSchema>;

export const updateCrewMemberSchema = z.object({
  fullName: z.string().min(1).max(300).optional(),
  role: z.string().max(200).optional(),
  phone: z.string().max(50).optional(),
  email: z.string().email().max(300).optional(),
  isActive: z.boolean().optional(),
});
export type UpdateCrewMemberInput = z.infer<typeof updateCrewMemberSchema>;

export const createVehicleSchema = z.object({
  name: z.string().min(1, "Name is required").max(300),
  plateNumber: z.string().max(50).optional(),
  vehicleType: z.string().max(100).optional(),
  capacityNotes: z.string().max(500).optional(),
});
export type CreateVehicleInput = z.infer<typeof createVehicleSchema>;

export const updateVehicleSchema = z.object({
  name: z.string().min(1).max(300).optional(),
  plateNumber: z.string().max(50).optional(),
  vehicleType: z.string().max(100).optional(),
  capacityNotes: z.string().max(500).optional(),
  isActive: z.boolean().optional(),
});
export type UpdateVehicleInput = z.infer<typeof updateVehicleSchema>;

const assignmentWindowSchema = z.object({
  roleOrPurpose: z.string().max(200).optional(),
  scheduledStartAt: z.string().datetime({ message: "scheduledStartAt must be an ISO timestamp" }),
  scheduledEndAt: z.string().datetime({ message: "scheduledEndAt must be an ISO timestamp" }),
  notes: z.string().max(1000).optional(),
});

export const assignCrewSchema = assignmentWindowSchema
  .extend({ crewMemberId: z.string().uuid("Select a crew member") })
  .refine((v) => new Date(v.scheduledEndAt).getTime() > new Date(v.scheduledStartAt).getTime(), {
    message: "scheduledEndAt must be after scheduledStartAt",
    path: ["scheduledEndAt"],
  });
export type AssignCrewInput = z.infer<typeof assignCrewSchema>;

export const assignVehicleSchema = assignmentWindowSchema
  .extend({ vehicleId: z.string().uuid("Select a vehicle") })
  .refine((v) => new Date(v.scheduledEndAt).getTime() > new Date(v.scheduledStartAt).getTime(), {
    message: "scheduledEndAt must be after scheduledStartAt",
    path: ["scheduledEndAt"],
  });
export type AssignVehicleInput = z.infer<typeof assignVehicleSchema>;
