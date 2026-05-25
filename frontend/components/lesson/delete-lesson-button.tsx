"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { ApiError, apiDelete } from "@/lib/api";
import { tenantPath } from "@/lib/orgs";

interface Props {
  orgSlug: string;
  courseSlug: string;
  sectionSlug: string;
  lessonSlug: string;
  lessonTitle: string;
}

export function DeleteLessonButton({
  orgSlug,
  courseSlug,
  sectionSlug,
  lessonSlug,
  lessonTitle,
}: Props) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  async function onConfirm() {
    setError(null);
    setIsDeleting(true);
    try {
      await apiDelete(
        `/api/v1/courses/${courseSlug}/sections/${sectionSlug}/lessons/${lessonSlug}`,
        { headers: { "X-Tenant-Slug": orgSlug } },
      );
      router.push(tenantPath(orgSlug, `/admin/courses/${courseSlug}/sections/${sectionSlug}`));
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setError("Only owners and instructors can delete lessons.");
      } else if (err instanceof ApiError && err.status === 404) {
        setError("Lesson no longer exists.");
      } else {
        setError(err instanceof Error ? err.message : "Could not delete lesson.");
      }
      setIsDeleting(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="outline" className="text-red-600 hover:text-red-700">
          Delete
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this lesson?</AlertDialogTitle>
          <AlertDialogDescription>
            <span className="font-mono">{lessonTitle}</span> will be permanently removed. This
            can&apos;t be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={isDeleting}
            className="bg-red-600 text-white hover:bg-red-700"
          >
            {isDeleting ? "Deleting..." : "Delete lesson"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
