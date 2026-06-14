"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { tenantPath } from "@/lib/orgs";

interface Props {
  orgSlug: string;
  courseSlug: string;
  priceLabel: string;
}

export function EnrollButton({ orgSlug, courseSlug, priceLabel }: Props) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  function onClick() {
    setIsSubmitting(true);
    // Paid courses go through the checkout page, where the buyer picks currency
    // and provider. Free courses never render this button - they're open access
    // and link straight into the first lesson.
    router.push(tenantPath(orgSlug, `/courses/${courseSlug}/checkout`));
  }

  return (
    <Button onClick={onClick} disabled={isSubmitting} size="lg" className="w-full">
      {isSubmitting ? "Opening checkout…" : `Buy for ${priceLabel}`}
    </Button>
  );
}
