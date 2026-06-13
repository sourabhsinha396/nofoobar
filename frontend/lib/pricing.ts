import type { Currency } from "@/lib/tenant";

// Purchasing-power-parity-flavoured exchange rates, expressed as
// `1 USD = N <currency>`. Deliberately NOT real FX:
//   - Real FX moves daily and would surprise creators.
//   - We want courses to be roughly equally affordable to buyers in
//     different markets, not equally priced after a daily FX lookup.
//
// Update these numbers when you want the platform-wide pricing
// suggestion to shift. They're a UX hint at form-fill time only - the
// creator can override any suggestion, and the buyer-facing price is
// whatever lives in the DB after submission.
const PPP_RATES_USD: Record<Currency, number> = {
  USD: 1.0,
  EUR: 0.85,
  GBP: 0.75,
  INR: 65,
  AUD: 1.4,
};

/**
 * Convert a major-unit amount (e.g. 29 for $29.00, not 2900 cents)
 * between two supported currencies using the PPP rates above.
 *
 * Rounding:
 *   - INR → nearest 10 (₹1882.50 → ₹1880) - INR pricing tends to use
 *     round tens, sub-rupee precision is unusual.
 *   - Everything else → nearest whole unit ($29.42 → $29).
 *
 * The caller is responsible for re-rendering the form field with the
 * returned value. Returns `amountMajor` unchanged when from === to.
 */
export function convertPpp(amountMajor: number, from: Currency, to: Currency): number {
  if (from === to) return amountMajor;
  const inUsd = amountMajor / PPP_RATES_USD[from];
  const inTarget = inUsd * PPP_RATES_USD[to];
  return to === "INR" ? Math.round(inTarget / 10) * 10 : Math.round(inTarget);
}

/** Same as convertPpp but in cents/paise. Mirrors backend/app/core/pricing.py. */
export function convertPppCents(amountCents: number, from: Currency, to: Currency): number {
  if (from === to) return amountCents;
  const inUsdCents = amountCents / PPP_RATES_USD[from];
  const inTargetCents = inUsdCents * PPP_RATES_USD[to];
  const unit = to === "INR" ? 1000 : 100;
  return Math.round(inTargetCents / unit) * unit;
}
