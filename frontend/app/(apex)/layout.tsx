import type { Metadata } from "next";
import type { ReactNode } from "react";

import { PostHogAnalytics } from "@/components/analytics/posthog-analytics";
import { Navbar } from "@/components/layout/navbar";
import { ScrollProgress } from "@/components/ui/scroll-progress";
import { apexPostHogConfig, shouldCaptureApexAnalytics } from "@/lib/analytics";
import { getCurrentUser } from "@/lib/auth";

// Social-share defaults for the marketing site only. Scoped to the (apex)
// route group so the nofoobar card never attaches to white-label tenant pages.
// og:title / og:description are intentionally omitted - Next fills them from
// each page's resolved title and description. The image path resolves to an
// absolute URL via metadataBase (set in the root layout).
export const metadata: Metadata = {
  openGraph: {
    type: "website",
    siteName: "nofoobar",
    locale: "en_US",
    images: [
      {
        url: "/images/og.jpg",
        width: 1200,
        height: 630,
        alt: "nofoobar, open-source LMS for course creators",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/images/og.jpg"],
  },
};

export default async function ApexLayout({ children }: { children: ReactNode }) {
  // Load PostHog (pageviews + session replay) for the marketing site, but only
  // when configured and only for non-staff viewers. We resolve the viewer here
  // rather than in the analytics component so a staff user's session is never
  // tracked - the SDK isn't even loaded for them. The /me lookup only fires for
  // logged-in visitors (anonymous ones short-circuit before any fetch).
  const posthog = apexPostHogConfig();
  const user = posthog ? await getCurrentUser() : null;
  const captureAnalytics = posthog !== null && shouldCaptureApexAnalytics(user);

  return (
    <>
      {captureAnalytics && posthog && (
        <PostHogAnalytics
          projectApiKey={posthog.projectApiKey}
          host={posthog.host}
          enableSessionRecording
        />
      )}
      <Navbar />
      <ScrollProgress className="bg-brand bg-none" />
      {children}
    </>
  );
}
