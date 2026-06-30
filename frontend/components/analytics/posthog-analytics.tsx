"use client";

import { usePathname } from "next/navigation";
import posthog from "posthog-js";
import { useEffect, useRef } from "react";

interface Props {
  projectApiKey: string;
  host: string;
  /**
   * Enable PostHog session replay. Off by default (tenant sites capture
   * pageviews only); the apex marketing site opts in. Replay also has to be
   * turned on in the PostHog project settings - this just stops the SDK from
   * disabling it.
   */
  enableSessionRecording?: boolean;
}

/**
 * Loads the PostHog browser SDK and captures a pageview on every client-side
 * navigation.
 *
 * Staff exclusion is handled by the caller (layouts only render this component
 * for capturable viewers - tenant owners/instructors and apex superusers are
 * never mounted), so if this is mounted at all, the viewer should be tracked.
 */
export function PostHogAnalytics({
  projectApiKey,
  host,
  enableSessionRecording = false,
}: Props) {
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
      disable_session_recording: !enableSessionRecording,
      session_recording: {
        // This is the PARENT side of cross-origin iframe recording. Lesson
        // pages iframe in the algoholia lab embed player, which forwards its
        // rrweb events here via postMessage. Without this flag the parent
        // silently drops those events and the iframe is blank in the replay.
        // The child (algoholia: instrumentation-client.ts) sets the same flag;
        // PostHog requires it on both ends.
        recordCrossOriginIframes: true,
      },
    });
    initialized.current = true;
  }, [projectApiKey, host, enableSessionRecording]);

  useEffect(() => {
    if (!initialized.current) return;
    // posthog reads the current URL from window.location automatically.
    posthog.capture("$pageview");
  }, [pathname]);

  return null;
}
