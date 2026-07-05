import "server-only";
import { createClient } from "@/lib/supabase/server";

// Reads the most recent non-deleted rate for a currency pair (manual or automatic).
// Every future money-handling module converts through this — never hardcodes a rate.
export async function getLatestRate(
  baseCurrency: string,
  quoteCurrency: string
): Promise<number | null> {
  if (baseCurrency === quoteCurrency) return 1;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("exchange_rates")
    .select("rate")
    .eq("base_currency", baseCurrency)
    .eq("quote_currency", quoteCurrency)
    .is("deleted_at", null)
    .order("rate_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return Number(data.rate);
}

export async function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string
): Promise<number | null> {
  const rate = await getLatestRate(fromCurrency, toCurrency);
  if (rate === null) return null;
  return amount * rate;
}
