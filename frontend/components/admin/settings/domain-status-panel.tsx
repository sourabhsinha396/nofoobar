"use client";

import { RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { apiGet } from "@/lib/api";

interface DomainStatus {
  configured: boolean;
  domain: string | null;
  expected_target: string | null;
  connected: boolean;
  resolved_ips: string[];
  expected_ips: string[];
  message: string | null;
}

// Live DNS status for the org's SAVED custom domain (not the draft in the
// form above — save first, then check). Polls nothing; the tenant clicks
// "Check again" after changing DNS at their provider.
export function DomainStatusPanel({ orgSlug }: { orgSlug: string }) {
  const [status, setStatus] = useState<DomainStatus | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const check = useCallback(async () => {
    setIsChecking(true);
    setError(null);
    try {
      const result = await apiGet<DomainStatus>(
        `/api/v1/orgs/${orgSlug}/domain-status`,
        { headers: { "X-Tenant-Slug": orgSlug } },
      );
      setStatus(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not check domain status.");
    } finally {
      setIsChecking(false);
    }
  }, [orgSlug]);

  useEffect(() => {
    void check();
  }, [check]);

  if (error) {
    return <p className="text-sm text-destructive">{error}</p>;
  }
  if (!status) {
    return <p className="text-sm text-muted-foreground">Checking domain status…</p>;
  }

  return (
    <div className="space-y-3">
      {status.configured ? (
        status.connected ? (
          <p className="text-sm text-emerald-600 dark:text-emerald-400">
            Connected — {status.domain} points at this platform. HTTPS is issued
            automatically on first visit.
          </p>
        ) : (
          <div className="space-y-2 text-sm">
            <p className="text-amber-600 dark:text-amber-400">
              Not connected yet{status.message ? ` — ${status.message}` : "."}
            </p>
            {status.expected_target && (
              <div className="rounded-md border border-border bg-muted/40 p-3 font-mono text-xs">
                <p>
                  CNAME&nbsp;&nbsp;{status.domain}&nbsp;&nbsp;→&nbsp;&nbsp;
                  {status.expected_target}
                </p>
                {status.expected_ips.length > 0 && (
                  <p className="mt-1 text-muted-foreground">
                    (apex domains: A record → {status.expected_ips.join(", ")})
                  </p>
                )}
              </div>
            )}
            {status.resolved_ips.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Currently resolves to: {status.resolved_ips.join(", ")}
              </p>
            )}
          </div>
        )
      ) : (
        <p className="text-sm text-muted-foreground">
          No custom domain connected. Enter one above and save, then point its
          DNS here.
        </p>
      )}
      {status.configured && (
        <Button type="button" variant="outline" size="sm" onClick={check} disabled={isChecking}>
          <RefreshCw className="mr-2 size-4" />
          {isChecking ? "Checking…" : "Check again"}
        </Button>
      )}
    </div>
  );
}
