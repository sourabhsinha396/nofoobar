import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api";
import {
  UploadCancelledError,
  VideoPollError,
  buildPlaybackUrl,
  initiateVideoUpload,
  pollVideoAsset,
  uploadVideoBytes,
} from "@/lib/video-upload";

// Browser calls are same-origin relative paths, served by the API proxy
// route handler (app/api/v1/[...path]/route.ts).
const API_BASE = "";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
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
  vi.restoreAllMocks();
});

describe("initiateVideoUpload", () => {
  it("POSTs to /uploads/video with the tenant slug and returns the upload handle", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        video_asset_id: "11111111-1111-1111-1111-111111111111",
        upload_url: "https://storage.googleapis.com/signed",
        provider: "mux",
      }),
    );

    const result = await initiateVideoUpload("acme");

    expect(result.upload_url).toBe("https://storage.googleapis.com/signed");
    expect(result.provider).toBe("mux");
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${API_BASE}/api/v1/uploads/video`);
    expect(init.method).toBe("POST");
    expect(init.credentials).toBe("include");
    expect(init.headers["X-Tenant-Slug"]).toBe("acme");
  });

  it("throws ApiError on non-2xx", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ detail: "not configured" }, 503));
    await expect(initiateVideoUpload("acme")).rejects.toBeInstanceOf(ApiError);
  });
});

describe("uploadVideoBytes", () => {
  it("PUTs the file body to the signed URL", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 200 }));
    const file = new File([new Uint8Array([1, 2, 3])], "v.mp4", { type: "video/mp4" });
    await uploadVideoBytes("https://signed.example.com/upload", file);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://signed.example.com/upload");
    expect(init.method).toBe("PUT");
    expect(init.body).toBe(file);
  });

  it("throws ApiError when the provider returns non-2xx", async () => {
    fetchMock.mockResolvedValueOnce(new Response("oops", { status: 500 }));
    const file = new File([new Uint8Array([1])], "v.mp4");
    await expect(
      uploadVideoBytes("https://signed.example.com/upload", file),
    ).rejects.toBeInstanceOf(ApiError);
  });

  it("throws UploadCancelledError when the signal is aborted mid-upload", async () => {
    fetchMock.mockImplementationOnce((_url, init) => {
      // Simulate fetch reacting to abort: throw AbortError-like exception
      return new Promise((_resolve, reject) => {
        init.signal?.addEventListener("abort", () => {
          reject(new DOMException("aborted", "AbortError"));
        });
      });
    });
    const ctrl = new AbortController();
    const file = new File([new Uint8Array([1])], "v.mp4");
    const promise = uploadVideoBytes("https://signed.example.com/upload", file, ctrl.signal);
    ctrl.abort();
    await expect(promise).rejects.toBeInstanceOf(UploadCancelledError);
  });
});

describe("pollVideoAsset", () => {
  function makeReady() {
    return {
      id: "vid",
      provider: "mux",
      status: "ready",
      playback_ref: "playback_xyz",
      duration_seconds: 30,
      max_resolution_height: 720,
    };
  }

  function makePending() {
    return {
      id: "vid",
      provider: "mux",
      status: "pending",
      playback_ref: null,
      duration_seconds: null,
      max_resolution_height: null,
    };
  }

  it("returns immediately when the first poll is already ready", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(makeReady()));
    const result = await pollVideoAsset("acme", "vid", { intervalMs: 10 });
    expect(result.status).toBe("ready");
    expect(result.playback_ref).toBe("playback_xyz");
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("polls until status flips to ready and invokes onUpdate each time", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(makePending()))
      .mockResolvedValueOnce(jsonResponse(makePending()))
      .mockResolvedValueOnce(jsonResponse(makeReady()));
    const updates: string[] = [];

    const result = await pollVideoAsset("acme", "vid", {
      intervalMs: 5,
      onUpdate: (s) => updates.push(s.status),
    });

    expect(result.status).toBe("ready");
    expect(updates).toEqual(["pending", "pending", "ready"]);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("throws VideoPollError when status becomes errored", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ ...makePending(), status: "errored" }),
    );
    await expect(pollVideoAsset("acme", "vid", { intervalMs: 5 })).rejects.toBeInstanceOf(
      VideoPollError,
    );
  });

  it("throws VideoPollError when the deadline is exceeded", async () => {
    // Fresh Response per call - Response bodies are single-read.
    fetchMock.mockImplementation(() => Promise.resolve(jsonResponse(makePending())));
    await expect(
      pollVideoAsset("acme", "vid", { intervalMs: 10, timeoutMs: 30 }),
    ).rejects.toBeInstanceOf(VideoPollError);
  });

  it("throws UploadCancelledError when the signal is aborted between polls", async () => {
    fetchMock.mockImplementation(() => Promise.resolve(jsonResponse(makePending())));
    const ctrl = new AbortController();
    setTimeout(() => ctrl.abort(), 5);
    await expect(
      pollVideoAsset("acme", "vid", { intervalMs: 50, signal: ctrl.signal }),
    ).rejects.toBeInstanceOf(UploadCancelledError);
  });

  it("propagates ApiError on HTTP failure during polling", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ detail: "boom" }, 500));
    await expect(pollVideoAsset("acme", "vid", { intervalMs: 5 })).rejects.toBeInstanceOf(
      ApiError,
    );
  });
});

describe("buildPlaybackUrl", () => {
  it("builds a Mux player URL", () => {
    expect(buildPlaybackUrl("mux", "abc123")).toBe("https://player.mux.com/abc123");
  });

  it("throws for unsupported providers (until implemented)", () => {
    expect(() => buildPlaybackUrl("bunny", "abc")).toThrow();
    expect(() => buildPlaybackUrl("cloudflare", "abc")).toThrow();
  });
});
