import { headers } from "next/headers";

import { resolveCustomDomain } from "@/lib/resolve-domain";
import { APEX_ORIGIN } from "@/lib/site-url";

// Resolves the current request's Host into "apex" (the platform marketing site)
// or "tenant" (a storefront on a subdomain or custom domain). Mirrors the
// routing in proxy.ts, but runs inside the host-aware robots.ts / sitemap.ts
// metadata routes, which the proxy lets through un-rewritten so they can serve
// apex- or tenant-specific output from the same file.
const TENANT_HOST = process.env.NEXT_PUBLIC_TENANT_HOST?.toLowerCase();
const PROTOCOL = process.env.NEXT_PUBLIC_TENANT_PROTOCOL ?? "https";

export type SeoHost =
  | { kind: "apex"; origin: string }
  | { kind: "tenant"; slug: string; origin: string };

export async function resolveSeoHost(): Promise<SeoHost> {
  const apex: SeoHost = { kind: "apex", origin: APEX_ORIGIN };

  if (!TENANT_HOST) {
    return apex;
  }

  const requestHeaders = await headers();
  const host = (requestHeaders.get("host") ?? "").toLowerCase();
  if (!host || host === TENANT_HOST || host === `www.${TENANT_HOST}`) {
    return apex;
  }

  const origin = `${PROTOCOL}://${host}`;

  const suffix = `.${TENANT_HOST}`;
  if (host.endsWith(suffix)) {
    const slug = host.slice(0, -suffix.length);
    // Reject empty or dotted labels (e.g. a.b.tenant-host) - those aren't a
    // single tenant subdomain.
    return slug && !slug.includes(".")
      ? { kind: "tenant", slug, origin }
      : apex;
  }

  // Anything else is a candidate custom domain - ask the backend.
  const slug = await resolveCustomDomain(host);
  return slug ? { kind: "tenant", slug, origin } : apex;
}
