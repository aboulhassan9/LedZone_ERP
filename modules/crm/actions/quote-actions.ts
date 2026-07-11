"use server";

import { revalidatePath } from "next/cache";
import { runAction } from "@/modules/crm/shared/run-action";
import type { ActionResult } from "@/modules/warehouse/types/action-result";
import { quoteService } from "@/modules/crm/services/quote-service";
import type { CreateQuoteInput, UpdateQuoteInput, SetQuoteStatusInput } from "@/modules/crm/schemas/quote-schema";
import type { QuoteRow, QuoteLineItemRow } from "@/modules/crm/repositories/quote-repository";

function revalidateQuotes(id?: string) {
  revalidatePath("/crm/quotes");
  if (id) revalidatePath(`/crm/quotes/${id}`);
}

export async function createQuoteAction(
  input: CreateQuoteInput
): Promise<ActionResult<{ quote: QuoteRow; lineItems: QuoteLineItemRow[] }>> {
  const result = await runAction(() => quoteService.createQuote(input));
  revalidateQuotes();
  return result;
}

export async function updateQuoteAction(id: string, input: UpdateQuoteInput): Promise<ActionResult<QuoteRow>> {
  const result = await runAction(() => quoteService.updateQuote(id, input));
  revalidateQuotes(id);
  return result;
}

export async function getQuoteAction(
  id: string
): Promise<ActionResult<{ quote: QuoteRow; lineItems: QuoteLineItemRow[] }>> {
  return runAction(() => quoteService.getQuote(id));
}

export async function listQuotesAction(customerId?: string): Promise<ActionResult<QuoteRow[]>> {
  return runAction(() => quoteService.listQuotes(customerId));
}

export async function setQuoteStatusAction(
  id: string,
  input: SetQuoteStatusInput
): Promise<ActionResult<QuoteRow>> {
  const result = await runAction(() => quoteService.setQuoteStatus(id, input));
  revalidateQuotes(id);
  return result;
}
