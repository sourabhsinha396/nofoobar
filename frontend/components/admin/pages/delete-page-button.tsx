"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
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
import { ApiError, apiDelete } from "@/lib/api";
import { tenantPath } from "@/lib/orgs";

interface Props {
  orgSlug: string;
  pageSlug: string;
}

export function DeletePageButton({ orgSlug, pageSlug }: Props) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onConfirm() {
    setError(null);
    setIsDeleting(true);
    try {
      await apiDelete(`/api/v1/admin/pages/${pageSlug}`, {
        headers: { "X-Tenant-Slug": orgSlug },
      });
      router.push(tenantPath(orgSlug, "/admin/pages"));
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setError("Only owners can delete pages.");
      } else {
        setError(err instanceof Error ? err.message : "Could not delete.");
      }
      setIsDeleting(false);
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Trash2 className="mr-2 size-4" />
          Delete
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this page?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently removes the page and its content. Any link to{" "}
            <code>/{pageSlug}</code> will 404.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={isDeleting}>
            {isDeleting ? "Deleting…" : "Delete page"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
