import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError, apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api";

const FETCH_BASE = "http://localhost:8000";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function emptyResponse(status: number): Response {
  return new Response(null, { status });
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("apiGet", () => {
  it("GETs the path and returns parsed JSON", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true }));
    const result = await apiGet<{ ok: boolean }>("/api/v1/health");
    expect(result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${FETCH_BASE}/api/v1/health`);
    expect(init.method).toBe("GET");
    expect(init.credentials).toBe("include");
    // no body → no Content-Type header
    expect(init.headers).toBeUndefined();
  });

  it("passes optional headers through", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({}));
    await apiGet("/api/v1/tenant", { headers: { "X-Tenant-Slug": "acme" } });
    const init = fetchMock.mock.calls[0][1];
    expect(init.headers).toEqual({ "X-Tenant-Slug": "acme" });
  });
});

describe("apiPost", () => {
  it("POSTs JSON body with Content-Type header", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: "1" }, 201));
    const result = await apiPost<{ id: string }>("/api/v1/courses", { slug: "intro" });
    expect(result).toEqual({ id: "1" });
    const init = fetchMock.mock.calls[0][1];
    expect(init.method).toBe("POST");
    expect(init.body).toBe(JSON.stringify({ slug: "intro" }));
    expect(init.headers).toMatchObject({ "Content-Type": "application/json" });
  });

  it("merges Content-Type with caller-provided headers", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({}));
    await apiPost("/api/v1/courses", { slug: "x" }, { headers: { "X-Tenant-Slug": "acme" } });
    const init = fetchMock.mock.calls[0][1];
    expect(init.headers).toEqual({
      "X-Tenant-Slug": "acme",
      "Content-Type": "application/json",
    });
  });
});

describe("apiPatch", () => {
  it("uses the PATCH method", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({}));
    await apiPatch("/api/v1/courses/intro", { title: "New" });
    expect(fetchMock.mock.calls[0][1].method).toBe("PATCH");
  });
});

describe("apiDelete", () => {
  it("uses the DELETE method with no body", async () => {
    fetchMock.mockResolvedValueOnce(emptyResponse(204));
    const result = await apiDelete("/api/v1/courses/intro");
    expect(result).toBeUndefined();
    const init = fetchMock.mock.calls[0][1];
    expect(init.method).toBe("DELETE");
    expect(init.body).toBeUndefined();
  });
});

describe("error handling", () => {
  it("throws ApiError with status and detail from JSON response", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ detail: "Slug already used in this organization" }, 409),
    );
    await expect(apiPost("/api/v1/courses", {})).rejects.toMatchObject({
      name: "ApiError",
      status: 409,
      message: "Slug already used in this organization",
    });
  });

  it("throws ApiError with fallback message when body isn't JSON", async () => {
    fetchMock.mockResolvedValueOnce(new Response("Internal Server Error", { status: 500 }));
    const err = await apiGet("/api/v1/courses").catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(500);
    expect((err as ApiError).message).toBe("HTTP 500");
  });
});
