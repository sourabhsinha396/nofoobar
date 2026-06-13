from typing import Literal

# Mirror of frontend/lib/pricing.ts. KEEP IN SYNC - if you change one set of
# rates here, change the other. Deliberately NOT real FX:
#   - Real FX moves daily and would surprise buyers + creators.
#   - We want courses to be roughly equally affordable across markets, not
#     equally priced after a daily FX lookup.
#
# Rates are expressed as `1 USD = N <currency>`. Update them when you want
# platform-wide pricing to shift.

Currency = Literal["USD", "EUR", "GBP", "INR", "AUD"]

PPP_RATES_USD: dict[Currency, float] = {
    "USD": 1.0,
    "EUR": 0.85,
    "GBP": 0.75,
    "INR": 65.0,
    "AUD": 1.4,
}


def convert_ppp_cents(amount_cents: int, from_currency: Currency, to_currency: Currency) -> int:
    """Convert a smallest-currency-unit amount (cents/paise) between two
    supported currencies using the PPP rates above.

    Rounding mirrors the frontend lib:
      - INR → nearest 1000 paise (₹10) so the rupee amount is whole tens.
      - Everything else → nearest 100 cents (one major unit).
    """
    if from_currency == to_currency:
        return amount_cents
    in_usd_cents = amount_cents / PPP_RATES_USD[from_currency]
    in_target_cents = in_usd_cents * PPP_RATES_USD[to_currency]
    unit = 1000 if to_currency == "INR" else 100
    return int(round(in_target_cents / unit) * unit)
