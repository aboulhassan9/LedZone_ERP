"use server";

import { revalidatePath } from "next/cache";
import { runAction } from "@/modules/rental/shared/run-action";
import type { ActionResult } from "@/modules/warehouse/types/action-result";
import { rentalAgreementService } from "@/modules/rental/services/rental-agreement-service";
import type {
  CreateRentalAgreementInput,
  UpdateRentalAgreementInput,
  SetAgreementStatusInput,
  SetDepositStatusInput,
} from "@/modules/rental/schemas/rental-agreement-schema";
import type {
  RentalAgreementRow,
  RentalAgreementLineItemRow,
} from "@/modules/rental/repositories/rental-agreement-repository";

function revalidateAgreements(id?: string) {
  revalidatePath("/rental");
  if (id) revalidatePath(`/rental/${id}`);
}

export async function createRentalAgreementAction(
  input: CreateRentalAgreementInput
): Promise<ActionResult<{ agreement: RentalAgreementRow; lineItems: RentalAgreementLineItemRow[] }>> {
  const result = await runAction(() => rentalAgreementService.createAgreement(input));
  revalidateAgreements();
  return result;
}

export async function updateRentalAgreementAction(
  id: string,
  input: UpdateRentalAgreementInput
): Promise<ActionResult<RentalAgreementRow>> {
  const result = await runAction(() => rentalAgreementService.updateAgreement(id, input));
  revalidateAgreements(id);
  return result;
}

export async function getRentalAgreementAction(
  id: string
): Promise<ActionResult<{ agreement: RentalAgreementRow; lineItems: RentalAgreementLineItemRow[] }>> {
  return runAction(() => rentalAgreementService.getAgreement(id));
}

export async function listRentalAgreementsAction(
  customerId?: string
): Promise<ActionResult<RentalAgreementRow[]>> {
  return runAction(() => rentalAgreementService.listAgreements(customerId));
}

export async function setAgreementStatusAction(
  id: string,
  input: SetAgreementStatusInput
): Promise<ActionResult<RentalAgreementRow>> {
  const result = await runAction(() => rentalAgreementService.setAgreementStatus(id, input));
  revalidateAgreements(id);
  return result;
}

export async function setDepositStatusAction(
  id: string,
  input: SetDepositStatusInput
): Promise<ActionResult<RentalAgreementRow>> {
  const result = await runAction(() => rentalAgreementService.setDepositStatus(id, input));
  revalidateAgreements(id);
  return result;
}
