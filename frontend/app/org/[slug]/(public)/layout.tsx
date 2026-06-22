import type { ReactNode } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PostHogAnalytics } from "@/components/analytics/posthog-analytics";
import { ScrollProgress } from "@/components/ui/scroll-progress";
import { HideOnLessonPages } from "@/components/layout/hide-on-lesson-pages";
import { TenantFooter } from "@/components/layout/tenant-footer";
import { TenantNavbar } from "@/components/layout/tenant-navbar";
import { tenantOrigin } from "@/lib/site-url";
import { getTenantOrg } from "@/lib/tenant";

interface Props {
  children: ReactNode;
  params: Promise<{ slug: string }>;
}

// Tenant storefronts are white-label: their titles must read "<page> | <org>",
// never "| nofoobar". `title.absolute` sets the default for pages that don't
// declare a title (e.g. the home page) while ignoring the apex root template,
// and `title.template` re-bases deeper pages onto the org's own brand.
//
// Tenant-configured SEO overrides take precedence over the display fields:
// meta_title -> home <title>, meta_description -> meta description, and
// og_image_url -> the tenant's own social card. og:title/description are left
// for Next to fill per-page from each route's resolved title/description.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const org = await getTenantOrg(slug);
  if (!org) {
    return {};
  }
  const title = org.meta_title ?? org.name;
  const description = org.meta_description ?? org.description ?? undefined;
  const ogImage = org.og_image_url ?? undefined;
  return {
    // Tenant pages are reachable on a subdomain AND a custom domain; pin the
    // metadata base to the tenant's canonical origin (custom domain favoured)
    // so per-page relative canonicals below all resolve to one preferred host.
    metadataBase: new URL(tenantOrigin(org.slug, org.custom_domain)),
    title: {
      absolute: title,
      template: `%s | ${org.name}`,
    },
    description,
    openGraph: {
      type: "website",
      siteName: org.name,
      locale: "en_US",
      ...(ogImage ? { images: [{ url: ogImage }] } : {}),
    },
    ...(ogImage
      ? { twitter: { card: "summary_large_image" as const, images: [ogImage] } }
      : {}),
  };
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
          enableSessionRecording
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
