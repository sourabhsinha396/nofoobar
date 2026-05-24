import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const TENANT_HOST = process.env.NEXT_PUBLIC_TENANT_HOST?.toLowerCase();

// Paths that only exist on the apex — visiting them on a tenant subdomain
// should redirect back to the apex, not get rewritten into /org/[slug]/...
const APEX_ONLY_PATH_PREFIXES = ["/me", "/login", "/signup"];

function isApexOnlyPath(path: string): boolean {
  return APEX_ONLY_PATH_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));
}

export function proxy(request: NextRequest) {
  if (!TENANT_HOST) {
    return NextResponse.next();
  }

  const host = (request.headers.get("host") ?? "").toLowerCase();

  if (host === TENANT_HOST || host === `www.${TENANT_HOST}`) {
    return NextResponse.next();
  }

  const suffix = `.${TENANT_HOST}`;
  if (!host.endsWith(suffix)) {
    return NextResponse.next();
  }

  const slug = host.slice(0, -suffix.length);
  if (!slug || slug.includes(".")) {
    return NextResponse.next();
  }

  const path = request.nextUrl.pathname;

  if (isApexOnlyPath(path)) {
    const apexUrl = request.nextUrl.clone();
    apexUrl.host = TENANT_HOST;
    return NextResponse.redirect(apexUrl);
  }

  const url = request.nextUrl.clone();
  url.pathname = `/org/${slug}${path === "/" ? "" : path}`;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
