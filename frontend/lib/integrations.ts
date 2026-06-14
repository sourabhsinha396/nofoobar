import { LineChart, MessageSquare, Webhook } from "lucide-react";
import type { ComponentType } from "react";

import type {
  AvailableIntegration,
  IntegrationProvider,
  OrgIntegration,
  PlanTier,
} from "@/lib/tenant";

export interface FieldMeta {
  name: string;
  label: string;
  type: "text" | "url" | "password";
  placeholder: string;
  defaultValue?: string;
}

export interface ProviderMeta {
  label: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  fields: FieldMeta[];
  /** Config field shown as the summary of a configured instance (non-secret). */
  summaryField?: string;
  docsUrl?: string;
  /** Helper line under the form. Defaults to the secret-storage note. */
  note?: string;
}

export const PROVIDER_META: Record<IntegrationProvider, ProviderMeta> = {
  webhook: {
    label: "Webhook",
    description: "Send a signed JSON payload to any URL when events happen in your org.",
    icon: Webhook,
    fields: [
      {
        name: "url",
        label: "Endpoint URL",
        type: "url",
        placeholder: "https://example.com/hooks/nofoobar",
      },
      {
        name: "signing_secret",
        label: "Signing secret",
        type: "password",
        placeholder: "A shared secret you'll verify deliveries with",
      },
    ],
    summaryField: "url",
  },
  slack: {
    label: "Slack",
    description: "Post a message to a Slack channel when events happen in your org.",
    icon: MessageSquare,
    fields: [
      {
        name: "webhook_url",
        label: "Slack incoming webhook URL",
        type: "password",
        placeholder: "https://hooks.slack.com/services/...",
      },
    ],
    docsUrl: "https://api.slack.com/messaging/webhooks",
  },
  posthog: {
    label: "PostHog",
    description: "Track pageviews and product analytics on your public site.",
    icon: LineChart,
    fields: [
      { name: "project_api_key", label: "Project API key", type: "text", placeholder: "phc_..." },
      {
        name: "host",
        label: "PostHog host",
        type: "text",
        placeholder: "https://us.i.posthog.com",
        defaultValue: "https://us.i.posthog.com",
      },
    ],
    summaryField: "project_api_key",
    docsUrl: "https://posthog.com/docs/libraries/js",
    note: "Your project key is public - it runs in visitors' browsers. Owners and instructors are never tracked.",
  },
};

export const PLAN_LABEL: Record<PlanTier, string> = {
  free: "Free",
  starter: "Starter",
  pro: "Pro",
  enterprise: "Enterprise",
};

export function isIntegrationProvider(value: string): value is IntegrationProvider {
  return value in PROVIDER_META;
}

export function defaultValues(meta: ProviderMeta): Record<string, string> {
  const out: Record<string, string> = {};
  for (const field of meta.fields) {
    if (field.defaultValue) out[field.name] = field.defaultValue;
  }
  return out;
}

export function summaryFor(meta: ProviderMeta, integration: OrgIntegration): string {
  const field = meta.summaryField;
  if (field && integration.config[field]) {
    return integration.config[field];
  }
  return "Connected";
}

export function integrationsForProvider(
  all: OrgIntegration[] | null,
  provider: IntegrationProvider,
): OrgIntegration[] {
  return (all ?? []).filter((integration) => integration.provider === provider);
}

// List ordering: connected first, then available-but-empty, then plan-locked.
// Original order within each group is preserved (stable sort).
export function sortAvailableIntegrations(
  available: AvailableIntegration[],
  integrations: OrgIntegration[] | null,
): AvailableIntegration[] {
  function rank(item: AvailableIntegration): number {
    if (!item.allowed) return 2;
    return integrationsForProvider(integrations, item.provider).length > 0 ? 0 : 1;
  }
  return [...available].sort((a, b) => rank(a) - rank(b));
}
