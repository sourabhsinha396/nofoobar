import { describe, expect, it } from "vitest";

import {
  integrationsForProvider,
  isIntegrationProvider,
  sortAvailableIntegrations,
} from "@/lib/integrations";
import type { AvailableIntegration, OrgIntegration } from "@/lib/tenant";

function available(
  provider: AvailableIntegration["provider"],
  allowed: boolean,
): AvailableIntegration {
  return { provider, min_plan: allowed ? "free" : "pro", allowed, config_schema: {} };
}

function configured(provider: OrgIntegration["provider"]): OrgIntegration {
  return {
    id: `${provider}-1`,
    provider,
    enabled: true,
    config: {},
    created_at: "2026-06-14T00:00:00Z",
  };
}

describe("isIntegrationProvider", () => {
  it("accepts known providers and rejects anything else", () => {
    expect(isIntegrationProvider("slack")).toBe(true);
    expect(isIntegrationProvider("webhook")).toBe(true);
    expect(isIntegrationProvider("nope")).toBe(false);
    expect(isIntegrationProvider("")).toBe(false);
  });
});

describe("integrationsForProvider", () => {
  it("filters by provider and tolerates a null list", () => {
    const all = [configured("webhook"), configured("slack"), configured("webhook")];
    expect(integrationsForProvider(all, "webhook")).toHaveLength(2);
    expect(integrationsForProvider(all, "posthog")).toHaveLength(0);
    expect(integrationsForProvider(null, "slack")).toEqual([]);
  });
});

describe("sortAvailableIntegrations", () => {
  it("orders connected first, then available-but-empty, then plan-locked", () => {
    const list: AvailableIntegration[] = [
      available("webhook", true), // available, empty
      available("slack", true), // connected
      available("posthog", false), // locked
    ];
    const sorted = sortAvailableIntegrations(list, [configured("slack")]);
    expect(sorted.map((i) => i.provider)).toEqual(["slack", "webhook", "posthog"]);
  });

  it("preserves original order within a group (stable)", () => {
    const list: AvailableIntegration[] = [
      available("webhook", true),
      available("slack", true),
      available("posthog", true),
    ];
    const sorted = sortAvailableIntegrations(list, null);
    expect(sorted.map((i) => i.provider)).toEqual(["webhook", "slack", "posthog"]);
  });

  it("does not mutate the input array", () => {
    const list: AvailableIntegration[] = [available("slack", true), available("webhook", true)];
    sortAvailableIntegrations(list, [configured("webhook")]);
    expect(list.map((i) => i.provider)).toEqual(["slack", "webhook"]);
  });
});
