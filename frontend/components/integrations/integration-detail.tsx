"use client";

import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { ApiError, apiDelete, apiPatch, apiPost } from "@/lib/api";
import { PROVIDER_META, defaultValues, summaryFor } from "@/lib/integrations";
import type { IntegrationProvider, OrgIntegration } from "@/lib/tenant";

interface Props {
  orgSlug: string;
  provider: IntegrationProvider;
  integrations: OrgIntegration[];
}

export function IntegrationDetail({ orgSlug, provider, integrations }: Props) {
  const router = useRouter();
  const meta = PROVIDER_META[provider];
  const headers = { "X-Tenant-Slug": orgSlug };

  const [values, setValues] = useState<Record<string, string>>(() => defaultValues(meta));
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function onAdd(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await apiPost("/api/v1/admin/integrations", { provider, config: values }, { headers });
      setValues(defaultValues(meta));
      router.refresh();
    } catch (err) {
      setError(messageFor(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function onToggle(integration: OrgIntegration) {
    setError(null);
    setBusyId(integration.id);
    try {
      await apiPatch(
        `/api/v1/admin/integrations/${integration.id}`,
        { enabled: !integration.enabled },
        { headers },
      );
      router.refresh();
    } catch (err) {
      setError(messageFor(err));
    } finally {
      setBusyId(null);
    }
  }

  async function onDelete(integration: OrgIntegration) {
    if (!window.confirm(`Remove this ${meta.label} integration?`)) {
      return;
    }
    setError(null);
    setBusyId(integration.id);
    try {
      await apiDelete(`/api/v1/admin/integrations/${integration.id}`, { headers });
      router.refresh();
    } catch (err) {
      setError(messageFor(err));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      {integrations.length > 0 && (
        <ul className="space-y-2">
          {integrations.map((integration) => (
            <li
              key={integration.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2"
            >
              <span className="min-w-0 truncate font-mono text-xs text-muted-foreground">
                {summaryFor(meta, integration)}
              </span>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Switch
                    checked={integration.enabled}
                    onCheckedChange={() => onToggle(integration)}
                    disabled={busyId === integration.id}
                  />
                  {integration.enabled ? "On" : "Off"}
                </label>
                <Button
                  variant="destructive"
                  size="icon-sm"
                  onClick={() => onDelete(integration)}
                  disabled={busyId === integration.id}
                  aria-label={`Remove ${meta.label} integration`}
                >
                  <Trash2 />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {integrations.length > 0 && <Separator className="my-6" />}

      <form onSubmit={onAdd} className="space-y-4">
        {meta.fields.map((field) => (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={`${provider}-${field.name}`}>{field.label}</Label>
            <Input
              id={`${provider}-${field.name}`}
              type={field.type}
              value={values[field.name] ?? ""}
              onChange={(e) =>
                setValues((current) => ({ ...current, [field.name]: e.target.value }))
              }
              placeholder={field.placeholder}
              autoComplete="off"
              required
            />
          </div>
        ))}
        <p className="text-xs text-muted-foreground">
          {meta.note ?? "Secrets are stored encrypted and never shown again."}
          {meta.docsUrl && (
            <>
              {" "}
              <a
                href={meta.docsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2"
              >
                {meta.label} setup guide
              </a>
              .
            </>
          )}
        </p>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" disabled={submitting}>
          <Plus />
          {submitting ? "Connecting..." : `Add ${meta.label.toLowerCase()}`}
        </Button>
      </form>
    </div>
  );
}

function messageFor(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 403) return err.message || "Only the org owner can manage integrations.";
    if (err.status === 422) return "Please check the values and try again.";
    return err.message;
  }
  return err instanceof Error ? err.message : "Something went wrong.";
}
