import "server-only";
import { assertAnyPermission } from "@/modules/warehouse/shared/authorize";
import { logWarehouseAudit } from "@/modules/warehouse/shared/audit";
import { ConflictError, NotFoundError, toWarehouseError } from "@/modules/warehouse/errors";
import {
  createReservationSchema,
  type CreateReservationInput,
} from "@/modules/warehouse/schemas/warehouse-reservation-schema";
import {
  warehouseReservationRepository,
  type WarehouseReservationRow,
} from "@/modules/warehouse/repositories/warehouse-reservation-repository";
import { warehouseLocationService } from "@/modules/warehouse/services/warehouse-location-service";

async function requireReservation(id: string): Promise<WarehouseReservationRow> {
  const reservation = await warehouseReservationRepository.findById(id);
  if (!reservation) throw new NotFoundError("Reservation");
  return reservation;
}

// Prevents double booking: an item can only have one active (unreleased, unexpired)
// reservation at a time. This is now enforced atomically by create_warehouse_reservation
// (0047) — a partial unique index on warehouse_reservations(item_id) where released_at is
// null — rather than a check-then-insert here, which couldn't guarantee it under
// concurrent requests for the same item. A location reservation instead defers to
// WarehouseLocationService.assertCapacity, since a bin can validly hold multiple reserved
// units up to its declared capacity (not the race this fixes).
async function createReservation(input: CreateReservationInput): Promise<WarehouseReservationRow> {
  await assertAnyPermission(["warehouse.manage", "warehouse.location.manage"]);
  const parsed = createReservationSchema.parse(input);

  if (new Date(parsed.expiresAt).getTime() <= Date.now()) {
    throw new ConflictError("expiresAt must be in the future.");
  }

  if (parsed.warehouseLocationId) {
    await warehouseLocationService.assertCapacity(parsed.warehouseLocationId, 1);
  }

  try {
    const reservation = await warehouseReservationRepository.createViaTransaction(parsed);
    await logWarehouseAudit("warehouse_reservation.created", "warehouse_reservations", reservation.id, {
      warehouseLocationId: parsed.warehouseLocationId,
      itemId: parsed.itemId,
      reservedForType: parsed.reservedForType,
      expiresAt: parsed.expiresAt,
    });
    return reservation;
  } catch (error) {
    const pgError = error as { code?: string } | null;
    if (pgError?.code === "23505") {
      throw new ConflictError("This item already has an active reservation.");
    }
    throw toWarehouseError(error, "Reservation");
  }
}

async function releaseReservation(id: string): Promise<WarehouseReservationRow> {
  await assertAnyPermission(["warehouse.manage", "warehouse.location.manage"]);
  const reservation = await requireReservation(id);

  if (reservation.released_at) {
    throw new ConflictError("This reservation has already been released.");
  }

  const updated = await warehouseReservationRepository.release(id);
  await logWarehouseAudit("warehouse_reservation.released", "warehouse_reservations", id);
  return updated;
}

export const reservationService = { createReservation, releaseReservation };
