import "server-only";
import { assertAnyPermission } from "@/modules/crm/shared/authorize";
import { logCrmAudit } from "@/modules/crm/shared/audit";
import { ConflictError, NotFoundError, toCrmError } from "@/modules/crm/errors";
import {
  createQuoteSchema,
  updateQuoteSchema,
  setQuoteStatusSchema,
  type CreateQuoteInput,
  type UpdateQuoteInput,
  type SetQuoteStatusInput,
} from "@/modules/crm/schemas/quote-schema";
import {
  quoteRepository,
  type QuoteRow,
  type QuoteLineItemRow,
} from "@/modules/crm/repositories/quote-repository";

// A quote's status is a straightforward sales pipeline, not a physical-state machine like
// equipment_items -- a lightweight map is proportionate here, not the two-layer DB+app
// treatment that lifecycle-critical transitions get elsewhere in this codebase.
const TRANSITIONS: Record<string, string[]> = {
  draft: ["sent"],
  sent: ["accepted", "rejected", "expired"],
  accepted: [],
  rejected: [],
  expired: [],
};

async function requireQuote(id: string): Promise<QuoteRow> {
  const quote = await quoteRepository.findById(id);
  if (!quote) throw new NotFoundError("Quote");
  return quote;
}

async function createQuote(
  input: CreateQuoteInput
): Promise<{ quote: QuoteRow; lineItems: QuoteLineItemRow[] }> {
  const userId = await assertAnyPermission(["crm.manage", "crm.quotes.manage"]);
  const parsed = createQuoteSchema.parse(input);

  try {
    const quoteNumber = await quoteRepository.generateQuoteNumber();
    const quote = await quoteRepository.create(quoteNumber, parsed, userId);
    const lineItems = await quoteRepository.createLineItems(quote.id, parsed.lineItems);
    await logCrmAudit("quote.created", "quotes", quote.id, {
      customerId: parsed.customerId,
      lineItemCount: parsed.lineItems.length,
    });
    return { quote, lineItems };
  } catch (error) {
    throw toCrmError(error, "Quote");
  }
}

async function updateQuote(id: string, input: UpdateQuoteInput): Promise<QuoteRow> {
  const userId = await assertAnyPermission(["crm.manage", "crm.quotes.manage"]);
  const parsed = updateQuoteSchema.parse(input);
  const quote = await requireQuote(id);
  if (quote.status !== "draft") {
    throw new ConflictError(`Quote is "${quote.status}" -- only a draft quote can be edited.`);
  }

  try {
    const updated = await quoteRepository.update(id, parsed, userId);
    await logCrmAudit("quote.updated", "quotes", id, parsed);
    return updated;
  } catch (error) {
    throw toCrmError(error, "Quote");
  }
}

async function getQuote(id: string): Promise<{ quote: QuoteRow; lineItems: QuoteLineItemRow[] }> {
  await assertAnyPermission(["crm.manage", "crm.view"]);
  const quote = await requireQuote(id);
  const lineItems = await quoteRepository.findLineItems(id);
  return { quote, lineItems };
}

async function listQuotes(customerId?: string): Promise<QuoteRow[]> {
  await assertAnyPermission(["crm.manage", "crm.view"]);
  return quoteRepository.list(customerId);
}

async function setQuoteStatus(id: string, input: SetQuoteStatusInput): Promise<QuoteRow> {
  const userId = await assertAnyPermission(["crm.manage", "crm.quotes.manage"]);
  const parsed = setQuoteStatusSchema.parse(input);
  const quote = await requireQuote(id);

  if (!TRANSITIONS[quote.status]?.includes(parsed.status)) {
    throw new ConflictError(`Cannot move a "${quote.status}" quote to "${parsed.status}".`);
  }

  try {
    const updated = await quoteRepository.setStatus(id, parsed.status, userId);
    await logCrmAudit(`quote.${parsed.status}`, "quotes", id);
    return updated;
  } catch (error) {
    throw toCrmError(error, "Quote");
  }
}

export const quoteService = { createQuote, updateQuote, getQuote, listQuotes, setQuoteStatus };
