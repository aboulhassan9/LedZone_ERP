import { z } from "zod";

export const RESERVATION_FOR_TYPES = ["incoming_shipment", "event", "repair", "high_priority"] as const;

export const createReservationSchema = z
  .object({
    warehouseLocationId: z.string().uuid().optional(),
    itemId: z.string().uuid().optional(),
    reservedForType: z.enum(RESERVATION_FOR_TYPES),
    expiresAt: z.string().datetime({ message: "expiresAt must be an ISO timestamp" }),
    referenceNote: z.string().max(1000).optional(),
  })
  .refine((r) => (r.warehouseLocationId != null) !== (r.itemId != null), {
    message: "Set exactly one of warehouseLocationId or itemId.",
  });
export type CreateReservationInput = z.infer<typeof createReservationSchema>;
