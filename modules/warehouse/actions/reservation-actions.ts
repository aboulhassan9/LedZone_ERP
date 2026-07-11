"use server";

import { revalidatePath } from "next/cache";
import { runAction } from "@/modules/warehouse/shared/run-action";
import type { ActionResult } from "@/modules/warehouse/types/action-result";
import { reservationService } from "@/modules/warehouse/services/reservation-service";
import type { CreateReservationInput } from "@/modules/warehouse/schemas/warehouse-reservation-schema";
import type { WarehouseReservationRow } from "@/modules/warehouse/repositories/warehouse-reservation-repository";

function revalidateReservations() {
  revalidatePath("/warehouse/reservations");
}

export async function createReservationAction(
  input: CreateReservationInput
): Promise<ActionResult<WarehouseReservationRow>> {
  const result = await runAction(() => reservationService.createReservation(input));
  revalidateReservations();
  return result;
}

export async function releaseReservationAction(id: string): Promise<ActionResult<WarehouseReservationRow>> {
  const result = await runAction(() => reservationService.releaseReservation(id));
  revalidateReservations();
  return result;
}
