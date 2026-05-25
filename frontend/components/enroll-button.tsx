"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { ApiError, apiPost } from "@/lib/api";
import { tenantPath } from "@/lib/orgs";

interface Props {
  orgSlug: string;
  courseSlug: string;
  priceCents: number | null;
  currency: string;
  priceLabel: string;
}

export function EnrollButton({ orgSlug, courseSlug, priceCents, priceLabel }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isPaid = priceCents !== null && priceCents > 0;

  async function onClick() {
    setError(null);
    setIsSubmitting(true);
    if (isPaid) {
      // Paid courses go through the checkout page where the buyer picks
      // currency + provider. The actual gateway dispatch lives there.
      router.push(tenantPath(orgSlug, `/courses/${courseSlug}/checkout`));
      return;
    }
    try {
      await apiPost(
        `/api/v1/courses/${courseSlug}/enroll`,
        undefined,
        { headers: { "X-Tenant-Slug": orgSlug } },
      );
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError("Please sign in to enroll.");
      } else if (err instanceof ApiError && err.status === 404) {
        setError("This course is no longer available.");
      } else if (err instanceof ApiError && err.status === 409) {
        setError("You're already enrolled.");
      } else {
        setError(err instanceof Error ? err.message : "Could not start enrollment.");
      }
      setIsSubmitting(false);
    }
  }

  const label = isPaid ? `Buy for ${priceLabel}` : "Enroll now";
  const submittingLabel = isPaid ? "Opening checkout…" : "Enrolling…";

  return (
    <div className="flex flex-col gap-2">
      <Button onClick={onClick} disabled={isSubmitting} size="lg">
        {isSubmitting ? submittingLabel : label}
      </Button>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}
