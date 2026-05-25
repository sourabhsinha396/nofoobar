import { describe, expect, it } from "vitest";

import { convertPpp } from "@/lib/pricing";

describe("convertPpp", () => {
  it("returns the input unchanged when from === to", () => {
    expect(convertPpp(29, "USD", "USD")).toBe(29);
    expect(convertPpp(0, "INR", "INR")).toBe(0);
  });

  it("uses PPP rates (USD→INR ≈ 65, not real FX ~83)", () => {
    // $29 USD → ₹1885 INR at the 65x PPP rate (real FX would give ~₹2400).
    expect(convertPpp(29, "USD", "INR")).toBe(1890);
  });

  it("rounds INR amounts to the nearest 10", () => {
    // 19 / 0.85 ≈ 22.35 USD; * 65 = 1452.94 → rounds to 1450.
    expect(convertPpp(19, "EUR", "INR")).toBe(1450);
  });

  it("rounds non-INR amounts to the nearest whole unit", () => {
    expect(convertPpp(2000, "INR", "USD")).toBe(31); // 2000/65 = 30.77
    expect(convertPpp(29, "USD", "EUR")).toBe(25); // 29 * 0.85 = 24.65
    expect(convertPpp(29, "USD", "GBP")).toBe(22); // 29 * 0.75
    expect(convertPpp(29, "USD", "AUD")).toBe(41); // 29 * 1.40
  });

  it("routes non-USD pairs through USD as the base", () => {
    // EUR → GBP: 100 EUR / 0.85 ≈ 117.65 USD; * 0.75 ≈ 88.24 → rounds to 88.
    expect(convertPpp(100, "EUR", "GBP")).toBe(88);
  });

  it("survives a round-trip without drift larger than rounding", () => {
    const usd = 29;
    const inr = convertPpp(usd, "USD", "INR");
    const backToUsd = convertPpp(inr, "INR", "USD");
    expect(Math.abs(backToUsd - usd)).toBeLessThanOrEqual(1);
  });
});
