import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DomainStatusPanel } from "@/components/admin/settings/domain-status-panel";

let fetchMock: ReturnType<typeof vi.fn>;

function statusResponse(overrides: Record<string, unknown> = {}): Response {
  return new Response(
    JSON.stringify({
      configured: true,
      domain: "fastapitutorial.com",
      expected_target: "domains.nofoobar.com",
      connected: false,
      resolved_ips: [],
      expected_ips: ["135.181.40.128"],
      message: null,
      ...overrides,
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("DomainStatusPanel", () => {
  it("fetches status on mount with the tenant header", async () => {
    fetchMock.mockResolvedValueOnce(statusResponse({ connected: true }));
    render(<DomainStatusPanel orgSlug="fastapi" />);
    expect(await screen.findByText(/connected\./i)).toBeInTheDocument();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/v1/orgs/fastapi/domain-status");
    expect(init.headers).toMatchObject({ "X-Tenant-Slug": "fastapi" });
  });

  it("shows CNAME instructions when not connected", async () => {
    fetchMock.mockResolvedValueOnce(
      statusResponse({ connected: false, resolved_ips: ["9.9.9.9"] }),
    );
    render(<DomainStatusPanel orgSlug="fastapi" />);
    expect(await screen.findByText(/not connected yet/i)).toBeInTheDocument();
    expect(screen.getByText(/domains\.nofoobar\.com/)).toBeInTheDocument();
    expect(screen.getByText(/135\.181\.40\.128/)).toBeInTheDocument();
    expect(screen.getByText(/9\.9\.9\.9/)).toBeInTheDocument();
  });

  it("shows a hint when no domain is configured, without a check button", async () => {
    fetchMock.mockResolvedValueOnce(
      statusResponse({ configured: false, domain: null, connected: false }),
    );
    render(<DomainStatusPanel orgSlug="fastapi" />);
    expect(await screen.findByText(/no custom domain connected/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /check again/i })).not.toBeInTheDocument();
  });

  it("re-checks when Check again is clicked", async () => {
    fetchMock.mockResolvedValue(statusResponse({ connected: false }));
    render(<DomainStatusPanel orgSlug="fastapi" />);
    await screen.findByText(/not connected yet/i);
    fetchMock.mockResolvedValue(statusResponse({ connected: true }));
    await userEvent.click(screen.getByRole("button", { name: /check again/i }));
    expect(await screen.findByText(/connected\./i)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("surfaces fetch errors", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ detail: "Not a member of this organization" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      }),
    );
    render(<DomainStatusPanel orgSlug="fastapi" />);
    expect(
      await screen.findByText(/not a member of this organization/i),
    ).toBeInTheDocument();
  });
});
