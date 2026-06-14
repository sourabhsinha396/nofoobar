"use client";

import { usePathname } from "next/navigation";
import posthog from "posthog-js";
import { useEffect, useRef } from "react";

interface Props {
  projectApiKey: string;
  host: string;
}

/**
 * Loads the PostHog browser SDK for a tenant's public site and captures a
 * pageview on every client-side navigation.
 *
 * Owner/instructor exclusion is handled by the caller (the public layout only
 * renders this component for capturable viewers), so if this is mounted at all,
 * the viewer should be tracked.
 */
export function PostHogAnalytics({ projectApiKey, host }: Props) {
  const pathname = usePathname();
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    posthog.init(projectApiKey, {
      api_host: host,
      // We capture pageviews manually on route change (App Router); capture
      // pageleaves automatically for session duration.
      capture_pageview: false,
      capture_pageleave: true,
    });
    initialized.current = true;
  }, [projectApiKey, host]);

  useEffect(() => {
    if (!initialized.current) return;
    // posthog reads the current URL from window.location automatically.
    posthog.capture("$pageview");
  }, [pathname]);

  return null;
}
