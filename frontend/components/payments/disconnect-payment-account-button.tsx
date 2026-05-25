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
import type { PaymentProvider } from "@/lib/tenant";

interface Props {
  orgSlug: string;
  provider: PaymentProvider;
  providerLabel: string;
}

export function DisconnectPaymentAccountButton({
  orgSlug,
  provider,
  providerLabel,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onConfirm() {
    setError(null);
    setSubmitting(true);
    try {
      await apiDelete(`/api/v1/orgs/${orgSlug}/payment-accounts/${provider}`, {
        headers: { "X-Tenant-Slug": orgSlug },
      });
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not disconnect.");
      setSubmitting(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
          Disconnect
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Disconnect {providerLabel}?</AlertDialogTitle>
          <AlertDialogDescription>
            Buyers will no longer be able to check out paid courses through {providerLabel}.
            Existing enrollments aren&apos;t affected. You can reconnect later by pasting your keys
            again.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={submitting}
            className="bg-red-600 text-white hover:bg-red-700"
          >
            {submitting ? "Disconnecting..." : "Disconnect"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
