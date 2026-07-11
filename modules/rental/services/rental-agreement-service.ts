import "server-only";
import { assertAnyPermission } from "@/modules/rental/shared/authorize";
import { logRentalAudit } from "@/modules/rental/shared/audit";
import { ConflictError, NotFoundError, toRentalError } from "@/modules/rental/errors";
import {
  createRentalAgreementSchema,
  updateRentalAgreementSchema,
  setAgreementStatusSchema,
  setDepositStatusSchema,
  type CreateRentalAgreementInput,
  type UpdateRentalAgreementInput,
  type SetAgreementStatusInput,
  type SetDepositStatusInput,
} from "@/modules/rental/schemas/rental-agreement-schema";
import {
  rentalAgreementRepository,
  type RentalAgreementRow,
  type RentalAgreementLineItemRow,
} from "@/modules/rental/repositories/rental-agreement-repository";

// An agreement's status is a straightforward contract pipeline, not a physical-state machine
// like equipment_items -- a lightweight map is proportionate here, same decision made for
// modules/crm/services/quote-service.ts's TRANSITIONS. The underlying equipment's physical
// checkout/check-in is Planning/Warehouse's job, driven independently of this status.
const TRANSITIONS: Record<string, string[]> = {
  draft: ["active", "cancelled"],
  active: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

async function requireAgreement(id: string): Promise<RentalAgreementRow> {
  const agreement = await rentalAgreementRepository.findById(id);
  if (!agreement) throw new NotFoundError("Rental agreement");
  return agreement;
}

async function createAgreement(
  input: CreateRentalAgreementInput
): Promise<{ agreement: RentalAgreementRow; lineItems: RentalAgreementLineItemRow[] }> {
  const userId = await assertAnyPermission(["rental.manage", "rental.create"]);
  const parsed = createRentalAgreementSchema.parse(input);

  try {
    const agreementNumber = await rentalAgreementRepository.generateAgreementNumber();
    const agreement = await rentalAgreementRepository.create(agreementNumber, parsed, userId);
    const lineItems = await rentalAgreementRepository.createLineItems(agreement.id, parsed.lineItems);
    await logRentalAudit("rental_agreement.created", "rental_agreements", agreement.id, {
      customerId: parsed.customerId,
      lineItemCount: parsed.lineItems.length,
    });
    return { agreement, lineItems };
  } catch (error) {
    throw toRentalError(error, "Rental agreement");
  }
}

async function updateAgreement(
  id: string,
  input: UpdateRentalAgreementInput
): Promise<RentalAgreementRow> {
  const userId = await assertAnyPermission(["rental.manage", "rental.update"]);
  const parsed = updateRentalAgreementSchema.parse(input);
  const agreement = await requireAgreement(id);
  if (agreement.status !== "draft") {
    throw new ConflictError(`Agreement is "${agreement.status}" -- only a draft agreement can be edited.`);
  }

  try {
    const updated = await rentalAgreementRepository.update(id, parsed, userId);
    await logRentalAudit("rental_agreement.updated", "rental_agreements", id, parsed);
    return updated;
  } catch (error) {
    throw toRentalError(error, "Rental agreement");
  }
}

async function getAgreement(
  id: string
): Promise<{ agreement: RentalAgreementRow; lineItems: RentalAgreementLineItemRow[] }> {
  await assertAnyPermission(["rental.manage", "rental.view"]);
  const agreement = await requireAgreement(id);
  const lineItems = await rentalAgreementRepository.findLineItems(id);
  return { agreement, lineItems };
}

async function listAgreements(customerId?: string): Promise<RentalAgreementRow[]> {
  await assertAnyPermission(["rental.manage", "rental.view"]);
  return rentalAgreementRepository.list(customerId);
}

async function setAgreementStatus(
  id: string,
  input: SetAgreementStatusInput
): Promise<RentalAgreementRow> {
  const userId = await assertAnyPermission(["rental.manage", "rental.update"]);
  const parsed = setAgreementStatusSchema.parse(input);
  const agreement = await requireAgreement(id);

  if (!TRANSITIONS[agreement.status]?.includes(parsed.status)) {
    throw new ConflictError(`Cannot move a "${agreement.status}" agreement to "${parsed.status}".`);
  }

  try {
    const updated = await rentalAgreementRepository.setStatus(id, parsed.status, userId);
    await logRentalAudit(`rental_agreement.${parsed.status}`, "rental_agreements", id);
    return updated;
  } catch (error) {
    throw toRentalError(error, "Rental agreement");
  }
}

async function setDepositStatus(
  id: string,
  input: SetDepositStatusInput
): Promise<RentalAgreementRow> {
  const userId = await assertAnyPermission(["rental.manage", "rental.update"]);
  const parsed = setDepositStatusSchema.parse(input);
  const agreement = await requireAgreement(id);

  if (!["completed", "cancelled"].includes(agreement.status)) {
    throw new ConflictError("The deposit can only be settled once the agreement is completed or cancelled.");
  }
  if (agreement.deposit_status !== "held") {
    throw new ConflictError(`Deposit is already "${agreement.deposit_status}".`);
  }

  try {
    const updated = await rentalAgreementRepository.setDepositStatus(id, parsed.depositStatus, userId);
    await logRentalAudit(`rental_agreement.deposit_${parsed.depositStatus}`, "rental_agreements", id);
    return updated;
  } catch (error) {
    throw toRentalError(error, "Rental agreement");
  }
}

export const rentalAgreementService = {
  createAgreement,
  updateAgreement,
  getAgreement,
  listAgreements,
  setAgreementStatus,
  setDepositStatus,
};
