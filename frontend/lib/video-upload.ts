import { ApiError } from "@/lib/api";

// Relative paths - proxied to the backend by app/api/v1/[...path]/route.ts.
const API_URL = "";

export type VideoProviderName = "mux" | "bunny" | "cloudflare";

export type VideoAssetStatus = "pending" | "ready" | "errored" | "deleted";

export interface VideoUploadInitResponse {
  video_asset_id: string;
  upload_url: string;
  provider: VideoProviderName;
}

export interface VideoAssetState {
  id: string;
  provider: VideoProviderName;
  status: VideoAssetStatus;
  playback_ref: string | null;
  duration_seconds: number | null;
  max_resolution_height: number | null;
}

export class VideoPollError extends Error {
  state: VideoAssetState | null;

  constructor(message: string, state: VideoAssetState | null = null) {
    super(message);
    this.name = "VideoPollError";
    this.state = state;
  }
}

export class UploadCancelledError extends Error {
  constructor() {
    super("Upload cancelled");
    this.name = "UploadCancelledError";
  }
}

// 1. Ask our backend for a signed upload URL. The backend mints it via the
// provider (Mux for v1) and creates a VideoAsset row in `pending`.
export async function initiateVideoUpload(orgSlug: string): Promise<VideoUploadInitResponse> {
  const response = await fetch(`${API_URL}/api/v1/uploads/video`, {
    method: "POST",
    credentials: "include",
    headers: { "X-Tenant-Slug": orgSlug },
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({ detail: `HTTP ${response.status}` }));
    throw new ApiError(response.status, data.detail ?? `HTTP ${response.status}`);
  }
  return (await response.json()) as VideoUploadInitResponse;
}

// 2. PUT bytes directly to the provider. The URL is signed; no auth header
// needed. We let the browser set Content-Type from the File. Pass an
// AbortSignal so cancelling the dialog kills the in-flight request.
export async function uploadVideoBytes(
  uploadUrl: string,
  file: File,
  signal?: AbortSignal,
): Promise<void> {
  let response: Response;
  try {
    response = await fetch(uploadUrl, { method: "PUT", body: file, signal });
  } catch (err) {
    if (signal?.aborted) throw new UploadCancelledError();
    throw err;
  }
  if (!response.ok) {
    throw new ApiError(response.status, `Upload to provider failed: HTTP ${response.status}`);
  }
}

export interface PollOptions {
  intervalMs?: number;
  timeoutMs?: number;
  signal?: AbortSignal;
  onUpdate?: (state: VideoAssetState) => void;
}

// 3. Poll our GET endpoint until the asset is in a terminal state. Our
// backend, in turn, polls the provider - see docs/backend/video.md for why
// we use polling instead of webhooks.
export async function pollVideoAsset(
  orgSlug: string,
  videoAssetId: string,
  options: PollOptions = {},
): Promise<VideoAssetState> {
  const interval = options.intervalMs ?? 2500;
  const timeout = options.timeoutMs ?? 10 * 60 * 1000;
  const start = Date.now();

  while (true) {
    if (options.signal?.aborted) throw new UploadCancelledError();
    if (Date.now() - start > timeout) {
      throw new VideoPollError("Polling timed out before the video was ready");
    }

    const state = await fetchVideoAssetState(orgSlug, videoAssetId);
    options.onUpdate?.(state);

    if (state.status === "ready") return state;
    if (state.status === "errored") throw new VideoPollError("Video processing failed", state);
    if (state.status === "deleted") throw new VideoPollError("Video asset was deleted", state);

    await sleep(interval, options.signal);
  }
}

async function fetchVideoAssetState(
  orgSlug: string,
  videoAssetId: string,
): Promise<VideoAssetState> {
  const response = await fetch(`${API_URL}/api/v1/video_assets/${videoAssetId}`, {
    method: "GET",
    credentials: "include",
    headers: { "X-Tenant-Slug": orgSlug },
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({ detail: `HTTP ${response.status}` }));
    throw new ApiError(response.status, data.detail ?? `HTTP ${response.status}`);
  }
  return (await response.json()) as VideoAssetState;
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new UploadCancelledError());
      return;
    }
    const id = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(id);
        reject(new UploadCancelledError());
      },
      { once: true },
    );
  });
}

// Build the player URL from the provider + playback_ref. Same shape as the
// URL paste flow produces, so the tiptap VideoEmbed node renders identically.
export function buildPlaybackUrl(provider: VideoProviderName, playbackRef: string): string {
  if (provider === "mux") return `https://player.mux.com/${playbackRef}`;
  throw new Error(`Unsupported playback provider: ${provider}`);
}
