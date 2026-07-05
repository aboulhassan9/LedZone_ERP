// Currency formatting shared by every module that displays money (Rental, Finance,
// HR/Payroll, ...). LED Zone operates in USD and CDF today; Intl.NumberFormat handles
// any ISO 4217 code the `currencies` table adds later without code changes here.

const LOCALE_BY_CURRENCY: Record<string, string> = {
  USD: "en-US",
  CDF: "fr-CD",
};

export function formatMoney(amount: number, currencyCode: string): string {
  const locale = LOCALE_BY_CURRENCY[currencyCode] ?? "en-US";

  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency: currencyCode }).format(
      amount
    );
  } catch {
    // Unknown/unsupported ISO code for Intl — fall back to a plain "CODE amount" format.
    return `${currencyCode} ${amount.toFixed(2)}`;
  }
}
