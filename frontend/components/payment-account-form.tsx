"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError, apiPut } from "@/lib/api";
import type { PaymentProvider } from "@/lib/tenant";

interface Props {
  orgSlug: string;
  provider: PaymentProvider;
  /** Existing key_id from a connected account; pre-fills the field. */
  existingKeyId?: string;
}

const COPY: Record<
  PaymentProvider,
  { keyIdLabel: string; secretLabel: string; keyIdPlaceholder: string; dashboardUrl: string }
> = {
  stripe: {
    keyIdLabel: "Publishable key",
    secretLabel: "Secret key",
    keyIdPlaceholder: "pk_test_...",
    dashboardUrl: "https://dashboard.stripe.com/apikeys",
  },
  razorpay: {
    keyIdLabel: "Key ID",
    secretLabel: "Key Secret",
    keyIdPlaceholder: "rzp_test_...",
    dashboardUrl: "https://dashboard.razorpay.com/app/keys",
  },
};

export function PaymentAccountForm({ orgSlug, provider, existingKeyId }: Props) {
  const router = useRouter();
  const [keyId, setKeyId] = useState(existingKeyId ?? "");
  const [secretKey, setSecretKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const copy = COPY[provider];

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await apiPut(
        `/api/v1/orgs/${orgSlug}/payment-accounts/${provider}`,
        { key_id: keyId, secret_key: secretKey },
        { headers: { "X-Tenant-Slug": orgSlug } },
      );
      setSecretKey("");
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        setError(err.message);
      } else if (err instanceof ApiError && err.status === 403) {
        setError("Only the org owner can manage payment accounts.");
      } else {
        setError(err instanceof Error ? err.message : "Could not save credentials.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor={`${provider}-key-id`}>{copy.keyIdLabel}</Label>
        <Input
          id={`${provider}-key-id`}
          value={keyId}
          onChange={(e) => setKeyId(e.target.value)}
          placeholder={copy.keyIdPlaceholder}
          autoComplete="off"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${provider}-secret`}>{copy.secretLabel}</Label>
        <Input
          id={`${provider}-secret`}
          type="password"
          value={secretKey}
          onChange={(e) => setSecretKey(e.target.value)}
          autoComplete="off"
          required
        />
        <p className="text-xs text-muted-foreground">
          Stored encrypted. We never display it back, so paste it again when updating.
          Find your keys at{" "}
          <a
            href={copy.dashboardUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2"
          >
            {new URL(copy.dashboardUrl).hostname}
          </a>
          .
        </p>
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <Button type="submit" disabled={submitting}>
        {submitting ? "Saving..." : existingKeyId ? "Update keys" : "Save keys"}
      </Button>
    </form>
  );
}
