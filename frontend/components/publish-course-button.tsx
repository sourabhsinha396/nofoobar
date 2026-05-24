"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { ApiError, apiPatch } from "@/lib/api";
import type { CourseVisibility } from "@/lib/tenant";

interface Props {
  orgSlug: string;
  courseSlug: string;
  currentVisibility: CourseVisibility;
}

export function PublishCourseButton({ orgSlug, courseSlug, currentVisibility }: Props) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const target: CourseVisibility = currentVisibility === "draft" ? "published" : "draft";
  const label = currentVisibility === "draft" ? "Publish" : "Unpublish";

  async function onClick() {
    setError(null);
    setIsSubmitting(true);
    try {
      await apiPatch(
        `/api/v1/courses/${courseSlug}`,
        { visibility: target },
        { headers: { "X-Tenant-Slug": orgSlug } },
      );
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setError("Only owners and instructors can change visibility.");
      } else {
        setError(err instanceof Error ? err.message : "Could not update visibility.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <Button
        type="button"
        variant={currentVisibility === "draft" ? "default" : "outline"}
        size="sm"
        onClick={onClick}
        disabled={isSubmitting}
      >
        {isSubmitting ? "Saving..." : label}
      </Button>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
