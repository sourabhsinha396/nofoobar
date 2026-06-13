import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { resolveCustomDomain } from "@/lib/resolve-domain";

const TENANT_HOST = process.env.NEXT_PUBLIC_TENANT_HOST?.toLowerCase();

// Paths that only exist on the apex - visiting them on a tenant subdomain
// should redirect back to the apex, not get rewritten into /org/[slug]/...
const APEX_ONLY_PATH_PREFIXES = ["/me", "/login", "/signup"];

function isApexOnlyPath(path: string): boolean {
  return APEX_ONLY_PATH_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));
}

// Rewrite a tenant-site request (subdomain or custom domain) into the
// /org/[slug] tree, marking it with x-tenant-site so server components know
// the visitor's URL is bare (serverTenantPath). The header is set, never
// forwarded from the client - spoofing it on the apex only mangles link
// shapes in the spoofer's own response.
function tenantRewrite(request: NextRequest, slug: string): NextResponse {
  const path = request.nextUrl.pathname;
  const url = request.nextUrl.clone();
  url.pathname = `/org/${slug}${path === "/" ? "" : path}`;
  const headers = new Headers(request.headers);
  headers.set("x-tenant-site", slug);
  return NextResponse.rewrite(url, { request: { headers } });
}

export async function proxy(request: NextRequest) {
  if (!TENANT_HOST) {
    return NextResponse.next();
  }

  // API calls go to the same-origin proxy route handler on every host -
  // they must never be rewritten into /org/[slug]/api/... or redirected.
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  const host = (request.headers.get("host") ?? "").toLowerCase();

  if (host === TENANT_HOST || host === `www.${TENANT_HOST}`) {
    return NextResponse.next();
  }

  const suffix = `.${TENANT_HOST}`;
  if (host.endsWith(suffix)) {
    const slug = host.slice(0, -suffix.length);
    if (!slug || slug.includes(".")) {
      return NextResponse.next();
    }

    if (isApexOnlyPath(request.nextUrl.pathname)) {
      const apexUrl = request.nextUrl.clone();
      apexUrl.host = TENANT_HOST;
      return NextResponse.redirect(apexUrl);
    }

    return tenantRewrite(request, slug);
  }

  // Anything else is a candidate tenant custom domain (e.g.
  // fastapitutorial.com). Unlike platform subdomains there are no apex-only
  // redirects here: a custom domain is a white-label site, so /login and
  // /signup are the tenant's own pages and sessions are host-only.
  const slug = await resolveCustomDomain(host);
  if (!slug) {
    return NextResponse.next();
  }
  return tenantRewrite(request, slug);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
