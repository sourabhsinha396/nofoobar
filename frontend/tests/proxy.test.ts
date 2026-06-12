import { getRedirectUrl, getRewrittenUrl, isRewrite } from "next/experimental/testing/server";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const resolveCustomDomain = vi.fn();

vi.mock("@/lib/resolve-domain", () => ({
  resolveCustomDomain: (host: string) => resolveCustomDomain(host),
}));

// proxy.ts reads NEXT_PUBLIC_TENANT_HOST at module load, so stub the env and
// re-import per test run.
async function loadProxy() {
  vi.resetModules();
  const mod = await import("@/proxy");
  return mod.proxy;
}

function request(url: string): NextRequest {
  const host = new URL(url).host;
  return new NextRequest(url, { headers: { host } });
}

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_TENANT_HOST", "nofoobar.com");
  resolveCustomDomain.mockReset();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("proxy host routing", () => {
  it("passes the apex through untouched", async () => {
    const proxy = await loadProxy();
    const response = await proxy(request("https://nofoobar.com/me"));
    expect(isRewrite(response)).toBe(false);
    expect(resolveCustomDomain).not.toHaveBeenCalled();
  });

  it("rewrites a tenant subdomain into /org/[slug]", async () => {
    const proxy = await loadProxy();
    const response = await proxy(request("https://fastapi.nofoobar.com/admin"));
    expect(isRewrite(response)).toBe(true);
    expect(getRewrittenUrl(response)).toBe("https://fastapi.nofoobar.com/org/fastapi/admin");
    expect(resolveCustomDomain).not.toHaveBeenCalled();
  });

  it("marks subdomain rewrites with x-tenant-site for serverTenantPath", async () => {
    const proxy = await loadProxy();
    const response = await proxy(request("https://fastapi.nofoobar.com/admin"));
    // Next encodes overridden request headers in x-middleware-request-*.
    expect(response.headers.get("x-middleware-request-x-tenant-site")).toBe("fastapi");
  });

  it("redirects apex-only paths on a subdomain back to the apex", async () => {
    const proxy = await loadProxy();
    const response = await proxy(request("https://fastapi.nofoobar.com/me"));
    expect(getRedirectUrl(response)).toBe("https://nofoobar.com/me");
  });

  it("never rewrites /api paths, on any host", async () => {
    const proxy = await loadProxy();
    const response = await proxy(request("https://fastapi.nofoobar.com/api/v1/tenant"));
    expect(isRewrite(response)).toBe(false);
    expect(resolveCustomDomain).not.toHaveBeenCalled();
  });

  it("rewrites a resolved custom domain into /org/[slug]", async () => {
    resolveCustomDomain.mockResolvedValueOnce("fastapi");
    const proxy = await loadProxy();
    const response = await proxy(request("https://fastapitutorial.com/courses"));
    expect(resolveCustomDomain).toHaveBeenCalledWith("fastapitutorial.com");
    expect(isRewrite(response)).toBe(true);
    expect(getRewrittenUrl(response)).toBe("https://fastapitutorial.com/org/fastapi/courses");
  });

  it("rewrites the custom-domain root to the tenant homepage", async () => {
    resolveCustomDomain.mockResolvedValueOnce("fastapi");
    const proxy = await loadProxy();
    const response = await proxy(request("https://fastapitutorial.com/"));
    expect(getRewrittenUrl(response)).toBe("https://fastapitutorial.com/org/fastapi");
  });

  it("does NOT apply apex-only redirects on custom domains (white-label login)", async () => {
    resolveCustomDomain.mockResolvedValueOnce("fastapi");
    const proxy = await loadProxy();
    const response = await proxy(request("https://fastapitutorial.com/login"));
    expect(isRewrite(response)).toBe(true);
    expect(getRewrittenUrl(response)).toBe("https://fastapitutorial.com/org/fastapi/login");
  });

  it("passes unresolved hosts through to apex routes", async () => {
    resolveCustomDomain.mockResolvedValueOnce(null);
    const proxy = await loadProxy();
    const response = await proxy(request("https://unknown-domain.com/anything"));
    expect(isRewrite(response)).toBe(false);
  });

  it("does nothing when NEXT_PUBLIC_TENANT_HOST is unset", async () => {
    vi.stubEnv("NEXT_PUBLIC_TENANT_HOST", "");
    const proxy = await loadProxy();
    const response = await proxy(request("https://fastapitutorial.com/courses"));
    expect(isRewrite(response)).toBe(false);
    expect(resolveCustomDomain).not.toHaveBeenCalled();
  });
});
