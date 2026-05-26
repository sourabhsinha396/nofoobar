// Client-safe org helpers — types + path/URL builders. Anything that touches
// `next/headers` (cookies, headers) lives in `lib/orgs-server.ts` so this file
// can be imported from client components without dragging server-only code
// into the browser bundle.

export interface OrgSummary {
  id: string;
  slug: string;
  name: string;
  logo_url: string | null;
  description: string | null;
}

export type Role = "owner" | "instructor" | "student";

export interface Membership {
  org: OrgSummary;
  role: Role;
}

export function tenantUrl(slug: string, path: string = "/"): string {
  const host = process.env.NEXT_PUBLIC_TENANT_HOST;
  if (host) {
    const protocol = process.env.NEXT_PUBLIC_TENANT_PROTOCOL ?? "https";
    return `${protocol}://${slug}.${host}${path}`;
  }
  return path === "/" ? `/org/${slug}` : `/org/${slug}${path}`;
}

// In-tenant navigation: returns a relative path that works in both subdomain
// mode (`/admin`) and apex path mode (`/org/<slug>/admin`). Detects mode at
// runtime by checking whether the current URL is path-prefixed.
export function tenantPath(slug: string, path: string): string {
  if (typeof window !== "undefined" && window.location.pathname.startsWith(`/org/${slug}`)) {
    return path === "/" ? `/org/${slug}` : `/org/${slug}${path}`;
  }
  return path;
}
