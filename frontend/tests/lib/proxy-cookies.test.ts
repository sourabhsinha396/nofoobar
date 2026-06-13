import { describe, expect, it } from "vitest";

import { platformCookieDomain, rewriteSetCookieForHost } from "@/lib/proxy-cookies";

const COOKIE = "session=abc123; Path=/; HttpOnly; SameSite=lax";

describe("platformCookieDomain", () => {
  it("returns .apex for the apex host", () => {
    expect(platformCookieDomain("nofoobar.com", "nofoobar.com")).toBe(".nofoobar.com");
  });

  it("returns .apex for a tenant subdomain", () => {
    expect(platformCookieDomain("fastapi.nofoobar.com", "nofoobar.com")).toBe(".nofoobar.com");
  });

  it("returns undefined (host-only) for a custom domain", () => {
    expect(platformCookieDomain("fastapitutorial.com", "nofoobar.com")).toBeUndefined();
  });

  it("ignores ports on both hosts", () => {
    expect(platformCookieDomain("demo.testholic.test:3000", "testholic.test:3000")).toBe(
      ".testholic.test",
    );
  });

  it("returns undefined when no tenant host is configured", () => {
    expect(platformCookieDomain("nofoobar.com", undefined)).toBeUndefined();
  });
});

describe("rewriteSetCookieForHost", () => {
  it("scopes the cookie to .apex on the apex host (shared platform session)", () => {
    expect(rewriteSetCookieForHost(COOKIE, "nofoobar.com", "nofoobar.com")).toBe(
      `${COOKIE}; Domain=.nofoobar.com`,
    );
  });

  it("scopes the cookie to .apex on a tenant subdomain", () => {
    expect(rewriteSetCookieForHost(COOKIE, "fastapi.nofoobar.com", "nofoobar.com")).toBe(
      `${COOKIE}; Domain=.nofoobar.com`,
    );
  });

  it("leaves the cookie host-only on a custom domain", () => {
    expect(rewriteSetCookieForHost(COOKIE, "fastapitutorial.com", "nofoobar.com")).toBe(COOKIE);
  });

  it("strips a backend-set Domain attribute on custom domains", () => {
    expect(
      rewriteSetCookieForHost(
        "session=abc; Path=/; Domain=.nofoobar.com; HttpOnly",
        "fastapitutorial.com",
        "nofoobar.com",
      ),
    ).toBe("session=abc; Path=/; HttpOnly");
  });

  it("replaces a backend-set Domain attribute on platform hosts", () => {
    expect(
      rewriteSetCookieForHost(
        "session=abc; Path=/; Domain=evil.example.com; HttpOnly",
        "fastapi.nofoobar.com",
        "nofoobar.com",
      ),
    ).toBe("session=abc; Path=/; HttpOnly; Domain=.nofoobar.com");
  });

  it("ignores ports on both the tenant host and the request host", () => {
    expect(rewriteSetCookieForHost(COOKIE, "acme.testholic.test:3000", "testholic.test:3000")).toBe(
      `${COOKIE}; Domain=.testholic.test`,
    );
  });

  it("does not treat a lookalike domain as a platform host", () => {
    // evilnofoobar.com ends with "nofoobar.com" as a string but is not a
    // subdomain - it must stay host-only.
    expect(rewriteSetCookieForHost(COOKIE, "evilnofoobar.com", "nofoobar.com")).toBe(COOKIE);
  });

  it("is host-only everywhere when no tenant host is configured", () => {
    expect(rewriteSetCookieForHost(COOKIE, "nofoobar.com", undefined)).toBe(COOKIE);
  });
});
