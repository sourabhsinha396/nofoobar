"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ApiError, apiPost } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import { convertPppCents } from "@/lib/pricing";
import { openRazorpayCheckout } from "@/lib/razorpay";
import type { Currency, PaymentProvider } from "@/lib/tenant";

interface Props {
  orgSlug: string;
  courseSlug: string;
  courseTitle: string;
  basePriceCents: number;
  baseCurrency: Currency;
  connectedProviders: PaymentProvider[];
  userEmail?: string;
}

interface StripeRedirectPayload {
  kind: "stripe_redirect";
  redirect_url: string;
}

interface RazorpayModalPayload {
  kind: "razorpay_modal";
  order_id: string;
  key_id: string;
  amount: number;
  currency: string;
  success_redirect_url: string;
}

type CheckoutPayload = StripeRedirectPayload | RazorpayModalPayload;

interface CheckoutResponse {
  payment_attempt_id: string;
  payload: CheckoutPayload;
}

const CURRENCY_OPTIONS: ReadonlyArray<{ code: Currency; label: string }> = [
  { code: "USD", label: "USD ($)" },
  { code: "EUR", label: "EUR (€)" },
  { code: "GBP", label: "GBP (£)" },
  { code: "INR", label: "INR (₹)" },
  { code: "AUD", label: "AUD (A$)" },
];

const PROVIDER_LABEL: Record<PaymentProvider, string> = {
  stripe: "Stripe",
  razorpay: "Razorpay",
};

export function CheckoutForm({
  orgSlug,
  courseSlug,
  courseTitle,
  basePriceCents,
  baseCurrency,
  connectedProviders,
  userEmail,
}: Props) {
  const [currency, setCurrency] = useState<Currency>(baseCurrency);
  const [submittingProvider, setSubmittingProvider] = useState<PaymentProvider | null>(null);
  const [error, setError] = useState<string | null>(null);

  const convertedCents = useMemo(
    () => convertPppCents(basePriceCents, baseCurrency, currency),
    [basePriceCents, baseCurrency, currency],
  );

  async function payWith(provider: PaymentProvider) {
    setError(null);
    setSubmittingProvider(provider);
    try {
      const response = await apiPost<CheckoutResponse>(
        `/api/v1/courses/${courseSlug}/checkout`,
        { return_url_base: window.location.origin, provider, currency },
        { headers: { "X-Tenant-Slug": orgSlug } },
      );
      if (response.payload.kind === "stripe_redirect") {
        window.location.assign(response.payload.redirect_url);
        return;
      }
      const razorpayPayload = response.payload;
      await openRazorpayCheckout({
        key: razorpayPayload.key_id,
        orderId: razorpayPayload.order_id,
        amount: razorpayPayload.amount,
        currency: razorpayPayload.currency,
        name: courseTitle,
        prefill: userEmail ? { email: userEmail } : undefined,
        onSuccess: () => {
          window.location.assign(razorpayPayload.success_redirect_url);
        },
        onDismiss: () => setSubmittingProvider(null),
      });
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        setError(err.message);
      } else if (err instanceof ApiError && err.status === 409) {
        setError("You're already enrolled.");
      } else if (err instanceof ApiError && err.status === 401) {
        setError("Please sign in to continue.");
      } else {
        setError(err instanceof Error ? err.message : "Could not start checkout.");
      }
      setSubmittingProvider(null);
    }
  }

  if (connectedProviders.length === 0) {
    return (
      <div className="space-y-2">
        <p className="text-sm font-medium">Payments not yet set up</p>
        <p className="text-sm text-muted-foreground">
          This organization hasn&apos;t connected a payment provider. Contact the course author.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">You pay</p>
        <p className="mt-1 font-heading text-3xl font-semibold tracking-tight">
          {formatPrice(convertedCents, currency)}
        </p>
        {currency !== baseCurrency && (
          <p className="mt-1 text-xs text-muted-foreground">
            Adjusted from {formatPrice(basePriceCents, baseCurrency)} (base price).
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="checkout-currency" className="text-sm font-medium">
          Currency
        </Label>
        <select
          id="checkout-currency"
          value={currency}
          onChange={(e) => setCurrency(e.target.value as Currency)}
          className="h-11 w-full rounded-md border border-input bg-background px-3 text-base"
        >
          {CURRENCY_OPTIONS.map((opt) => (
            <option key={opt.code} value={opt.code}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Pay with</p>
        <div className="flex flex-col gap-2">
          {connectedProviders.map((provider) => {
            const razorpayBlocked = provider === "razorpay" && currency !== "INR";
            const disabled = submittingProvider !== null || razorpayBlocked;
            const submittingThis = submittingProvider === provider;
            return (
              <Button
                key={provider}
                onClick={() => payWith(provider)}
                disabled={disabled}
                variant={provider === "stripe" ? "default" : "outline"}
                size="lg"
                className="w-full"
              >
                {submittingThis
                  ? "Opening checkout…"
                  : `Pay with ${PROVIDER_LABEL[provider]}`}
              </Button>
            );
          })}
          {connectedProviders.includes("razorpay") && currency !== "INR" && (
            <p className="text-xs text-muted-foreground">
              Razorpay only supports INR. Pick INR above to enable it.
            </p>
          )}
        </div>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}
