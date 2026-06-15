// Absolute base URL of the apex (platform marketing) site, e.g.
// https://nofoobar.app. Derived from the same env the proxy uses to identify
// the apex host (NEXT_PUBLIC_TENANT_HOST), so there's a single source of truth
// for "where does the marketing site live". Tenant storefronts live on their
// own hosts (subdomains / custom domains) and must NOT use this base - their
// canonical/OG URLs are resolved per-request from the incoming host.
const PROTOCOL = process.env.NEXT_PUBLIC_TENANT_PROTOCOL ?? "https";
const HOST = process.env.NEXT_PUBLIC_TENANT_HOST ?? "localhost:3000";

/** Origin of the apex site, no trailing slash, e.g. `https://nofoobar.app`. */
export const APEX_ORIGIN = `${PROTOCOL}://${HOST}`;

/** Absolute apex URL for a path, e.g. apexUrl("/pricing"). */
export function apexUrl(path = "/"): string {
  return new URL(path, APEX_ORIGIN).toString();
}

/** `metadataBase` value for the apex site's Metadata. */
export const apexMetadataBase = new URL(APEX_ORIGIN);

/**
 * Canonical public origin for a tenant storefront: its connected custom domain
 * if set, otherwise its `<slug>.<platform-host>` subdomain. Used for absolute
 * URLs in structured data (and, later, canonical tags). Protocol/host port come
 * from the platform env, so dev subdomains keep their `:3000`.
 */
export function tenantOrigin(slug: string, customDomain: string | null): string {
  const host = customDomain ?? `${slug}.${HOST}`;
  return `${PROTOCOL}://${host}`;
}
