import type { MetadataRoute } from "next";

import { resolveSeoHost } from "@/lib/seo-host";
import { apexUrl } from "@/lib/site-url";
import { getPublishedCourses, getPublishedPages } from "@/lib/tenant";

// Host-aware sitemap. On the apex host it lists the marketing routes; on a
// tenant host it lists that storefront's public pages + published courses, with
// absolute URLs on the tenant's own domain. The proxy lets /sitemap.xml through
// un-rewritten so this single file can serve both.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const host = await resolveSeoHost();

  if (host.kind === "tenant") {
    const [courses, pages] = await Promise.all([
      getPublishedCourses(host.slug),
      getPublishedPages(host.slug),
    ]);
    const base = host.origin;

    return [
      { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
      { url: `${base}/courses`, changeFrequency: "weekly", priority: 0.9 },
      ...(courses ?? []).map((course) => ({
        url: `${base}/courses/${course.slug}`,
        changeFrequency: "weekly" as const,
        priority: 0.8,
      })),
      ...pages.map((page) => ({
        url: `${base}/${page.slug}`,
        changeFrequency: "monthly" as const,
        priority: 0.5,
      })),
    ];
  }

  const lastModified = new Date();
  return [
    {
      url: apexUrl("/"),
      lastModified,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: apexUrl("/pricing"),
      lastModified,
      changeFrequency: "monthly",
      priority: 0.8,
    },
  ];
}
