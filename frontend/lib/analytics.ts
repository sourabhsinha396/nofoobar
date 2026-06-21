import type { CurrentUser } from "@/lib/auth";

export interface PostHogClientConfig {
  projectApiKey: string;
  host: string;
}

const DEFAULT_HOST = "https://us.i.posthog.com";

/**
 * PostHog config for the apex marketing site, read from env. Unlike tenant
 * sites (whose key lives in their org config), the apex site is nofoobar's own
 * property, so its key is a build-time env var. Returns null when unconfigured
 * (e.g. local dev), in which case analytics simply don't load.
 */
export function apexPostHogConfig(): PostHogClientConfig | null {
  const projectApiKey = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
  if (!projectApiKey) {
    return null;
  }
  return {
    projectApiKey,
    host: process.env.NEXT_PUBLIC_POSTHOG_HOST || DEFAULT_HOST,
  };
}

/**
 * Whether to load analytics for this viewer. Platform staff (superusers) are
 * excluded so internal browsing - including session replays - never pollutes
 * the marketing site's product metrics. Anonymous visitors are captured.
 */
export function shouldCaptureApexAnalytics(user: CurrentUser | null): boolean {
  return !user?.is_superuser;
}
