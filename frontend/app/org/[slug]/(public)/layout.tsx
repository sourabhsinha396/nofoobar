import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { PostHogAnalytics } from "@/components/analytics/posthog-analytics";
import { ScrollProgress } from "@/components/ui/scroll-progress";
import { HideOnLessonPages } from "@/components/layout/hide-on-lesson-pages";
import { TenantFooter } from "@/components/layout/tenant-footer";
import { TenantNavbar } from "@/components/layout/tenant-navbar";
import { getTenantOrg } from "@/lib/tenant";

interface Props {
  children: ReactNode;
  params: Promise<{ slug: string }>;
}

export default async function TenantPublicLayout({ children, params }: Props) {
  const { slug } = await params;
  const org = await getTenantOrg(slug);
  if (!org) {
    notFound();
  }

  // Load analytics only for capturable viewers - owners and instructors are
  // excluded so staff browsing doesn't pollute the tenant's product metrics.
  const captureAnalytics =
    org.posthog !== null &&
    org.viewer_role !== "owner" &&
    org.viewer_role !== "instructor";

  return (
    <div className="flex min-h-screen flex-col">
      {captureAnalytics && org.posthog && (
        <PostHogAnalytics
          projectApiKey={org.posthog.project_api_key}
          host={org.posthog.host}
        />
      )}
      <TenantNavbar slug={slug} orgName={org.name} logoUrl={org.logo_url} />
      <div className="flex-1">{children}</div>
      <HideOnLessonPages>
        <TenantFooter slug={slug} org={org} />
      </HideOnLessonPages>
    </div>
  );
}
