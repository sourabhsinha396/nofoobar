import { INTERNAL_API_URL } from "@/lib/api-internal";

// Resolves a tenant custom domain (e.g. fastapitutorial.com) to its org slug
// by asking the backend, which looks up Organization.custom_domain via the
// X-Forwarded-Host trust path in _resolve_tenant. Called from the proxy on
// every request to an unrecognized host, so results are cached in-process:
// hits longer than misses, so a tenant connecting a new domain sees it go
// live within MISS_TTL without a restart.
const HIT_TTL_MS = 5 * 60_000;
const MISS_TTL_MS = 15_000;

interface CacheEntry {
  slug: string | null;
  expires: number;
}

const cache = new Map<string, CacheEntry>();

export async function resolveCustomDomain(host: string): Promise<string | null> {
  const key = host.split(":")[0].toLowerCase();
  if (!key) {
    return null;
  }
  const now = Date.now();
  const cached = cache.get(key);
  if (cached && cached.expires > now) {
    return cached.slug;
  }

  let slug: string | null = null;
  try {
    const response = await fetch(`${INTERNAL_API_URL}/api/v1/tenant`, {
      headers: { "x-forwarded-host": key },
      cache: "no-store",
    });
    if (response.ok) {
      const org = (await response.json()) as { slug?: unknown };
      slug = typeof org.slug === "string" ? org.slug : null;
    }
  } catch {
    // Backend unreachable: don't poison the cache — serve a stale answer if
    // we have one, otherwise let the request fall through to apex routes.
    return cached?.slug ?? null;
  }

  cache.set(key, { slug, expires: now + (slug ? HIT_TTL_MS : MISS_TTL_MS) });
  return slug;
}
