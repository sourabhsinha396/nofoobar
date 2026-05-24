"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { ApiError, apiPost } from "@/lib/api";

interface Props {
  orgSlug: string;
  courseSlug: string;
}

export function EnrollButton({ orgSlug, courseSlug }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onClick() {
    setError(null);
    setIsSubmitting(true);
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
      } else {
        setError(err instanceof Error ? err.message : "Could not enroll.");
      }
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button onClick={onClick} disabled={isSubmitting} size="lg">
        {isSubmitting ? "Enrolling..." : "Enroll now"}
      </Button>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}
