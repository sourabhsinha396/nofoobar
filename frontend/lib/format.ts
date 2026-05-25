/** Format a price stored as smallest-currency-unit cents.
 *
 * `formatPrice(9900, "USD")` -> "$99.00"
 * `formatPrice(9900, "INR")` -> "₹99.00"
 *
 * Falls back to the raw amount + currency code if Intl rejects the currency.
 */
export function formatPrice(cents: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency}`;
  }
}
