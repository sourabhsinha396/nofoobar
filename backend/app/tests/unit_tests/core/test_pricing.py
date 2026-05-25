from app.core.pricing import convert_ppp_cents


def test_returns_unchanged_when_same_currency():
    assert convert_ppp_cents(2900, "USD", "USD") == 2900


def test_usd_to_inr_uses_ppp_rate():
    # $29.00 (2900 cents) → ₹1885 (188500 paise) at the 65x rate.
    # Python round() uses banker's rounding (.5 → even); 188.5 rounds to 188.
    # Final: 188000 paise = ₹1880. (₹2400+ would be real FX; we want PPP.)
    assert convert_ppp_cents(2900, "USD", "INR") == 188000


def test_inr_to_usd_rounds_to_whole_dollars():
    # 200000 paise (₹2000) / 65 ≈ $30.77 → rounds to nearest 100 cents = $31.
    assert convert_ppp_cents(200000, "INR", "USD") == 3100


def test_routes_non_usd_pairs_through_usd():
    # 10000 cents (€100) / 0.85 ≈ $117.65 → * 0.75 ≈ £88.24 → rounds to £88.
    assert convert_ppp_cents(10000, "EUR", "GBP") == 8800


def test_round_trip_drift_within_one_major_unit():
    base_usd = 2900
    converted = convert_ppp_cents(base_usd, "USD", "INR")
    back = convert_ppp_cents(converted, "INR", "USD")
    # Allow ±1 major unit (100 cents) drift from rounding.
    assert abs(back - base_usd) <= 100
