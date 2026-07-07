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
// reservation at a time. A location reservation instead defers to
// WarehouseLocationService.assertCapacity, since a bin can validly hold multiple reserved
// units up to its declared capacity.
async function createReservation(input: CreateReservationInput): Promise<WarehouseReservationRow> {
  const userId = await assertAnyPermission(["warehouse.manage", "warehouse.location.manage"]);
  const parsed = createReservationSchema.parse(input);

  if (new Date(parsed.expiresAt).getTime() <= Date.now()) {
    throw new ConflictError("expiresAt must be in the future.");
  }

  if (parsed.itemId) {
    const existing = await warehouseReservationRepository.findActiveForItem(parsed.itemId);
    if (existing.length > 0) {
      throw new ConflictError("This item already has an active reservation.");
    }
  } else if (parsed.warehouseLocationId) {
    await warehouseLocationService.assertCapacity(parsed.warehouseLocationId, 1);
  }

  try {
    const reservation = await warehouseReservationRepository.create(parsed, userId);
    await logWarehouseAudit("warehouse_reservation.created", "warehouse_reservations", reservation.id, {
      warehouseLocationId: parsed.warehouseLocationId,
      itemId: parsed.itemId,
      reservedForType: parsed.reservedForType,
      expiresAt: parsed.expiresAt,
    });
    return reservation;
  } catch (error) {
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
