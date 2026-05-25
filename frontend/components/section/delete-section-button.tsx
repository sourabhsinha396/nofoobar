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
  sectionTitle: string;
  lessonCount: number;
}

export function DeleteSectionButton({
  orgSlug,
  courseSlug,
  sectionSlug,
  sectionTitle,
  lessonCount,
}: Props) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  async function onConfirm() {
    setError(null);
    setIsDeleting(true);
    try {
      await apiDelete(`/api/v1/courses/${courseSlug}/sections/${sectionSlug}`, {
        headers: { "X-Tenant-Slug": orgSlug },
      });
      router.push(tenantPath(orgSlug, `/admin/courses/${courseSlug}/curriculum`));
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setError("Only owners and instructors can delete sections.");
      } else if (err instanceof ApiError && err.status === 404) {
        setError("Section no longer exists.");
      } else {
        setError(err instanceof Error ? err.message : "Could not delete section.");
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
          <AlertDialogTitle>Delete this section?</AlertDialogTitle>
          <AlertDialogDescription>
            <span className="font-mono">{sectionTitle}</span>
            {lessonCount > 0 ? (
              <>
                {" "}
                and its {lessonCount} lesson{lessonCount === 1 ? "" : "s"} will be permanently
                removed.
              </>
            ) : (
              <> will be permanently removed.</>
            )}{" "}
            This can&apos;t be undone.
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
            {isDeleting ? "Deleting..." : "Delete section"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
