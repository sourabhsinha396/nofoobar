import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The resolver keeps an in-process cache at module level, so each test gets
// a fresh import.
async function loadResolver() {
  vi.resetModules();
  const mod = await import("@/lib/resolve-domain");
  return mod.resolveCustomDomain;
}

function orgResponse(slug: string): Response {
  return new Response(JSON.stringify({ slug, name: "X" }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("resolveCustomDomain", () => {
  it("resolves a registered domain to its slug via the backend", async () => {
    fetchMock.mockResolvedValueOnce(orgResponse("fastapi"));
    const resolve = await loadResolver();
    expect(await resolve("fastapitutorial.com")).toBe("fastapi");
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("/api/v1/tenant");
    expect(init.headers).toMatchObject({ "x-forwarded-host": "fastapitutorial.com" });
  });

  it("strips the port and lowercases before resolving", async () => {
    fetchMock.mockResolvedValueOnce(orgResponse("acme"));
    const resolve = await loadResolver();
    await resolve("Learn.ACME.test:3000");
    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers).toMatchObject({ "x-forwarded-host": "learn.acme.test" });
  });

  it("caches hits - second lookup makes no backend call", async () => {
    fetchMock.mockResolvedValueOnce(orgResponse("fastapi"));
    const resolve = await loadResolver();
    await resolve("fastapitutorial.com");
    expect(await resolve("fastapitutorial.com")).toBe("fastapi");
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("caches misses (404 from backend) as null", async () => {
    fetchMock.mockResolvedValue(new Response("{}", { status: 404 }));
    const resolve = await loadResolver();
    expect(await resolve("unknown.com")).toBeNull();
    expect(await resolve("unknown.com")).toBeNull();
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("serves a stale answer when the backend is unreachable", async () => {
    vi.useFakeTimers();
    try {
      fetchMock.mockResolvedValueOnce(orgResponse("fastapi"));
      const resolve = await loadResolver();
      await resolve("fastapitutorial.com");
      // Expire the cache entry, then make the backend unreachable.
      vi.advanceTimersByTime(10 * 60_000);
      fetchMock.mockRejectedValueOnce(new Error("ECONNREFUSED"));
      expect(await resolve("fastapitutorial.com")).toBe("fastapi");
    } finally {
      vi.useRealTimers();
    }
  });

  it("returns null for an empty host", async () => {
    const resolve = await loadResolver();
    expect(await resolve("")).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
