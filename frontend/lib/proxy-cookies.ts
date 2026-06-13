// Session-cookie scoping for the same-origin API proxy (hybrid model):
// on platform hosts (the apex and its tenant subdomains) the session is
// shared across the whole platform via Domain=.<apex>, so an owner who logs
// in at the apex is signed in on every tenant subdomain. On any other host
// (a tenant's custom domain) the Domain attribute is stripped so the cookie
// is host-only - each custom domain is an independent first-party site.

const TENANT_HOST = process.env.NEXT_PUBLIC_TENANT_HOST;

// The Domain attribute the session cookie must carry on this host -
// `.{apex}` on platform hosts, undefined (host-only) elsewhere. Setting and
// clearing the cookie MUST both go through this: a deletion only matches a
// cookie with the same Domain scope it was set with.
export function platformCookieDomain(
  requestHost: string,
  tenantHost: string | undefined = TENANT_HOST,
): string | undefined {
  const apex = tenantHost?.split(":")[0]?.toLowerCase();
  const host = requestHost.split(":")[0].toLowerCase();
  if (apex && (host === apex || host.endsWith(`.${apex}`))) {
    return `.${apex}`;
  }
  return undefined;
}

export function rewriteSetCookieForHost(
  setCookie: string,
  requestHost: string,
  tenantHost: string | undefined = TENANT_HOST,
): string {
  const withoutDomain = setCookie.replace(/;\s*domain=[^;]*/i, "");
  const domain = platformCookieDomain(requestHost, tenantHost);
  return domain ? `${withoutDomain}; Domain=${domain}` : withoutDomain;
}
