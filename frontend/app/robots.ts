import type { MetadataRoute } from "next";

import { resolveSeoHost } from "@/lib/seo-host";
import { apexUrl } from "@/lib/site-url";

// Host-aware robots. Served on every host (the proxy lets /robots.txt through
// un-rewritten). Disallows auth/private/API paths - they carry no SEO value -
// and points crawlers at the matching sitemap for that host.
export default async function robots(): Promise<MetadataRoute.Robots> {
  const host = await resolveSeoHost();

  if (host.kind === "tenant") {
    return {
      rules: {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/login", "/signup", "/my-learning"],
      },
      sitemap: `${host.origin}/sitemap.xml`,
    };
  }

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/me", "/login", "/signup"],
    },
    sitemap: apexUrl("/sitemap.xml"),
  };
}
