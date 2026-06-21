import { afterEach, describe, expect, it, vi } from "vitest";

import type { CurrentUser } from "@/lib/auth";
import { apexPostHogConfig, shouldCaptureApexAnalytics } from "@/lib/analytics";

afterEach(() => {
  vi.unstubAllEnvs();
});

function user(overrides: Partial<CurrentUser> = {}): CurrentUser {
  return { id: "u1", email: "a@b.com", name: "A", is_superuser: false, ...overrides };
}

describe("apexPostHogConfig", () => {
  it("returns null when the project token is unset", () => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN", "");
    expect(apexPostHogConfig()).toBeNull();
  });

  it("reads the token and falls back to the US host", () => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN", "phc_abc");
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_HOST", "");
    expect(apexPostHogConfig()).toEqual({
      projectApiKey: "phc_abc",
      host: "https://us.i.posthog.com",
    });
  });

  it("honors a custom host (e.g. EU/self-hosted)", () => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN", "phc_abc");
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_HOST", "https://eu.i.posthog.com");
    expect(apexPostHogConfig()?.host).toBe("https://eu.i.posthog.com");
  });
});

describe("shouldCaptureApexAnalytics", () => {
  it("captures anonymous visitors", () => {
    expect(shouldCaptureApexAnalytics(null)).toBe(true);
  });

  it("captures logged-in non-staff users", () => {
    expect(shouldCaptureApexAnalytics(user())).toBe(true);
  });

  it("excludes staff (superusers)", () => {
    expect(shouldCaptureApexAnalytics(user({ is_superuser: true }))).toBe(false);
  });
});
