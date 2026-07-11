import { z } from "zod";

export const FUEL_TYPES = ["gasoline", "diesel", "electric", "hybrid"] as const;
export const FLEET_STATUSES = ["active", "maintenance", "retired"] as const;

// Fleet only ever updates the fleet-specific columns added in migration 0071 -- vehicle
// identity (name/plate_number/vehicle_type/capacity_notes/is_active) stays Planning's field,
// created via its own existing vehicle-form-dialog. No create schema here: Fleet manages
// existing vehicles, it doesn't mint new directory entries.
export const updateVehicleFleetInfoSchema = z.object({
  make: z.string().max(100).optional(),
  model: z.string().max(100).optional(),
  year: z.coerce.number().int().min(1980).max(2100).optional(),
  vin: z.string().max(50).optional(),
  fuelType: z.enum(FUEL_TYPES).optional(),
  odometerKm: z.coerce.number().int().min(0).optional(),
  fleetStatus: z.enum(FLEET_STATUSES).optional(),
  insuranceExpiryDate: z.string().optional(),
  registrationExpiryDate: z.string().optional(),
});
export type UpdateVehicleFleetInfoInput = z.infer<typeof updateVehicleFleetInfoSchema>;
