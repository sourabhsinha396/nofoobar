"use client";

import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Card } from "@/components/ui/card";
import { ApiError, apiPost } from "@/lib/api";

interface Props {
  orgSlug: string;
  paymentAttemptId: string;
}

type Status = "verifying" | "enrolled" | "pending" | "error";

interface VerifyResponse {
  attempt: { id: string; status: string };
  enrolled: boolean;
}

/** Mounts on the success URL after Stripe redirect.
 *
 * Calls the verify endpoint; on success, refreshes the page so the rest of
 * the course landing re-renders with the new "Enrolled" state. The Stripe
 * webhook is the redundant safety net — it'll fire even if the user closes
 * this tab before verify finishes. */
export function PaymentVerifier({ orgSlug, paymentAttemptId }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("verifying");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function verify() {
      try {
        const result = await apiPost<VerifyResponse>(
          `/api/v1/payment-attempts/${paymentAttemptId}/verify`,
          undefined,
          { headers: { "X-Tenant-Slug": orgSlug } },
        );
        if (cancelled) return;
        if (result.enrolled) {
          setStatus("enrolled");
          router.refresh();
        } else {
          setStatus("pending");
        }
      } catch (err) {
        if (cancelled) return;
        setStatus("error");
        if (err instanceof ApiError) {
          setMessage(err.message);
        }
      }
    }

    verify();
    return () => {
      cancelled = true;
    };
  }, [orgSlug, paymentAttemptId, router]);

  if (status === "verifying") {
    return (
      <Card className="mb-6 flex flex-row items-center gap-3 p-4">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Confirming your payment…</p>
      </Card>
    );
  }
  if (status === "enrolled") {
    return (
      <Card className="mb-6 flex flex-row items-center gap-3 border-emerald-500/30 bg-emerald-500/10 p-4">
        <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400" />
        <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
          Payment confirmed. You&apos;re enrolled.
        </p>
      </Card>
    );
  }
  if (status === "pending") {
    return (
      <Card className="mb-6 flex flex-row items-center gap-3 border-amber-500/30 bg-amber-500/10 p-4">
        <Loader2 className="size-5 animate-spin text-amber-600 dark:text-amber-400" />
        <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
          Payment is still processing. Refresh in a moment.
        </p>
      </Card>
    );
  }
  return (
    <Card className="mb-6 flex flex-row items-center gap-3 border-red-500/30 bg-red-500/10 p-4">
      <XCircle className="size-5 text-red-600 dark:text-red-400" />
      <p className="text-sm font-medium text-red-700 dark:text-red-300">
        {message ?? "Couldn't confirm payment. Contact support if you were charged."}
      </p>
    </Card>
  );
}
