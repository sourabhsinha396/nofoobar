import { afterEach, describe, expect, it, vi } from "vitest";

import { tenantPath, tenantUrl } from "@/lib/orgs";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("tenantUrl", () => {
  it("falls back to path mode when NEXT_PUBLIC_TENANT_HOST is unset", () => {
    vi.stubEnv("NEXT_PUBLIC_TENANT_HOST", "");
    expect(tenantUrl("acme")).toBe("/org/acme");
    expect(tenantUrl("acme", "/admin")).toBe("/org/acme/admin");
  });

  it("builds a subdomain URL when NEXT_PUBLIC_TENANT_HOST is set", () => {
    vi.stubEnv("NEXT_PUBLIC_TENANT_HOST", "nofoobar.io");
    vi.stubEnv("NEXT_PUBLIC_TENANT_PROTOCOL", "https");
    expect(tenantUrl("acme")).toBe("https://acme.nofoobar.io/");
    expect(tenantUrl("acme", "/admin")).toBe("https://acme.nofoobar.io/admin");
  });

  it("honors NEXT_PUBLIC_TENANT_PROTOCOL=http for local dev", () => {
    vi.stubEnv("NEXT_PUBLIC_TENANT_HOST", "testholic.test:3000");
    vi.stubEnv("NEXT_PUBLIC_TENANT_PROTOCOL", "http");
    expect(tenantUrl("demo", "/admin")).toBe("http://demo.testholic.test:3000/admin");
  });
});

describe("tenantPath", () => {
  it("returns bare path when window.location is on a subdomain (no /org prefix)", () => {
    // jsdom default location is http://localhost:3000/ — no /org prefix → subdomain mode
    expect(tenantPath("demo", "/admin")).toBe("/admin");
    expect(tenantPath("demo", "/")).toBe("/");
  });

  it("prefixes /org/<slug> when window.location already includes it (path mode)", () => {
    window.history.pushState({}, "", "/org/demo/admin");
    expect(tenantPath("demo", "/admin")).toBe("/org/demo/admin");
    expect(tenantPath("demo", "/")).toBe("/org/demo");
    // restore so other tests aren't affected
    window.history.pushState({}, "", "/");
  });
});
