import "server-only";
import { assertAnyPermission } from "@/modules/finance/shared/authorize";
import { logFinanceAudit } from "@/modules/finance/shared/audit";
import { ConflictError, NotFoundError, toFinanceError } from "@/modules/finance/errors";
import {
  createInvoiceSchema,
  updateInvoiceSchema,
  setInvoiceStatusSchema,
  recordPaymentSchema,
  type CreateInvoiceInput,
  type UpdateInvoiceInput,
  type SetInvoiceStatusInput,
  type RecordPaymentInput,
} from "@/modules/finance/schemas/invoice-schema";
import {
  invoiceRepository,
  type InvoiceRow,
  type InvoiceLineItemRow,
  type InvoicePaymentRow,
} from "@/modules/finance/repositories/invoice-repository";

// An invoice's status is a straightforward billing pipeline, not a physical-state machine like
// equipment_items -- a lightweight map is proportionate here, same decision made for
// modules/crm/services/quote-service.ts's TRANSITIONS. "Overdue" is computed in the UI from
// due_date, never stored. Payment recording is independent of status -- a partial payment can
// land while an invoice is still "sent"; marking it "paid" is a deliberate, separate action.
const TRANSITIONS: Record<string, string[]> = {
  draft: ["sent", "cancelled"],
  sent: ["paid", "cancelled"],
  paid: [],
  cancelled: [],
};

async function requireInvoice(id: string): Promise<InvoiceRow> {
  const invoice = await invoiceRepository.findById(id);
  if (!invoice) throw new NotFoundError("Invoice");
  return invoice;
}

async function createInvoice(
  input: CreateInvoiceInput
): Promise<{ invoice: InvoiceRow; lineItems: InvoiceLineItemRow[] }> {
  const userId = await assertAnyPermission(["finance.manage", "finance.invoices.manage"]);
  const parsed = createInvoiceSchema.parse(input);

  try {
    const invoiceNumber = await invoiceRepository.generateInvoiceNumber();
    const invoice = await invoiceRepository.create(invoiceNumber, parsed, userId);
    const lineItems = await invoiceRepository.createLineItems(invoice.id, parsed.lineItems);
    await logFinanceAudit("invoice.created", "invoices", invoice.id, {
      customerId: parsed.customerId,
      lineItemCount: parsed.lineItems.length,
    });
    return { invoice, lineItems };
  } catch (error) {
    throw toFinanceError(error, "Invoice");
  }
}

async function updateInvoice(id: string, input: UpdateInvoiceInput): Promise<InvoiceRow> {
  const userId = await assertAnyPermission(["finance.manage", "finance.invoices.manage"]);
  const parsed = updateInvoiceSchema.parse(input);
  const invoice = await requireInvoice(id);
  if (invoice.status !== "draft") {
    throw new ConflictError(`Invoice is "${invoice.status}" -- only a draft invoice can be edited.`);
  }

  try {
    const updated = await invoiceRepository.update(id, parsed, userId);
    await logFinanceAudit("invoice.updated", "invoices", id, parsed);
    return updated;
  } catch (error) {
    throw toFinanceError(error, "Invoice");
  }
}

async function getInvoice(
  id: string
): Promise<{ invoice: InvoiceRow; lineItems: InvoiceLineItemRow[]; payments: InvoicePaymentRow[] }> {
  await assertAnyPermission(["finance.manage", "finance.view"]);
  const invoice = await requireInvoice(id);
  const [lineItems, payments] = await Promise.all([
    invoiceRepository.findLineItems(id),
    invoiceRepository.findPayments(id),
  ]);
  return { invoice, lineItems, payments };
}

async function listInvoices(customerId?: string): Promise<InvoiceRow[]> {
  await assertAnyPermission(["finance.manage", "finance.view"]);
  return invoiceRepository.list(customerId);
}

async function setInvoiceStatus(id: string, input: SetInvoiceStatusInput): Promise<InvoiceRow> {
  const userId = await assertAnyPermission(["finance.manage", "finance.invoices.manage"]);
  const parsed = setInvoiceStatusSchema.parse(input);
  const invoice = await requireInvoice(id);

  if (!TRANSITIONS[invoice.status]?.includes(parsed.status)) {
    throw new ConflictError(`Cannot move a "${invoice.status}" invoice to "${parsed.status}".`);
  }

  try {
    const updated = await invoiceRepository.setStatus(id, parsed.status, userId);
    await logFinanceAudit(`invoice.${parsed.status}`, "invoices", id);
    return updated;
  } catch (error) {
    throw toFinanceError(error, "Invoice");
  }
}

async function recordPayment(id: string, input: RecordPaymentInput): Promise<InvoicePaymentRow> {
  const userId = await assertAnyPermission(["finance.manage", "finance.invoices.manage"]);
  const parsed = recordPaymentSchema.parse(input);
  const invoice = await requireInvoice(id);

  if (invoice.status === "cancelled") {
    throw new ConflictError("Cannot record a payment against a cancelled invoice.");
  }

  try {
    const payment = await invoiceRepository.createPayment(id, parsed, userId);
    await logFinanceAudit("invoice.payment_recorded", "invoice_payments", payment.id, {
      invoiceId: id,
      amount: parsed.amount,
      method: parsed.method,
    });
    return payment;
  } catch (error) {
    throw toFinanceError(error, "Invoice payment");
  }
}

export const invoiceService = {
  createInvoice,
  updateInvoice,
  getInvoice,
  listInvoices,
  setInvoiceStatus,
  recordPayment,
};
