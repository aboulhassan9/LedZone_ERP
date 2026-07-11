"use server";

import { revalidatePath } from "next/cache";
import { runAction } from "@/modules/finance/shared/run-action";
import type { ActionResult } from "@/modules/warehouse/types/action-result";
import { invoiceService } from "@/modules/finance/services/invoice-service";
import type {
  CreateInvoiceInput,
  UpdateInvoiceInput,
  SetInvoiceStatusInput,
  RecordPaymentInput,
} from "@/modules/finance/schemas/invoice-schema";
import type {
  InvoiceRow,
  InvoiceLineItemRow,
  InvoicePaymentRow,
} from "@/modules/finance/repositories/invoice-repository";

function revalidateInvoices(id?: string) {
  revalidatePath("/finance/invoices");
  if (id) revalidatePath(`/finance/invoices/${id}`);
}

export async function createInvoiceAction(
  input: CreateInvoiceInput
): Promise<ActionResult<{ invoice: InvoiceRow; lineItems: InvoiceLineItemRow[] }>> {
  const result = await runAction(() => invoiceService.createInvoice(input));
  revalidateInvoices();
  return result;
}

export async function updateInvoiceAction(
  id: string,
  input: UpdateInvoiceInput
): Promise<ActionResult<InvoiceRow>> {
  const result = await runAction(() => invoiceService.updateInvoice(id, input));
  revalidateInvoices(id);
  return result;
}

export async function getInvoiceAction(
  id: string
): Promise<ActionResult<{ invoice: InvoiceRow; lineItems: InvoiceLineItemRow[]; payments: InvoicePaymentRow[] }>> {
  return runAction(() => invoiceService.getInvoice(id));
}

export async function listInvoicesAction(customerId?: string): Promise<ActionResult<InvoiceRow[]>> {
  return runAction(() => invoiceService.listInvoices(customerId));
}

export async function setInvoiceStatusAction(
  id: string,
  input: SetInvoiceStatusInput
): Promise<ActionResult<InvoiceRow>> {
  const result = await runAction(() => invoiceService.setInvoiceStatus(id, input));
  revalidateInvoices(id);
  return result;
}

export async function recordPaymentAction(
  id: string,
  input: RecordPaymentInput
): Promise<ActionResult<InvoicePaymentRow>> {
  const result = await runAction(() => invoiceService.recordPayment(id, input));
  revalidateInvoices(id);
  return result;
}
