"use client";

import { CheckCircle2, Loader2, Upload, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api";
import { detectVideoProvider, youtubeEmbedSrc } from "@/lib/tiptap-video-embed";
import {
  UploadCancelledError,
  VideoPollError,
  buildPlaybackUrl,
  initiateVideoUpload,
  pollVideoAsset,
  uploadVideoBytes,
} from "@/lib/video-upload";

type Phase = "empty" | "uploading" | "processing" | "filled" | "error";

interface Props {
  url: string;
  onChange: (next: { url: string; durationSeconds?: number }) => void;
  onBusyChange?: (busy: boolean) => void;
  orgSlug: string;
}

export function VideoLessonPicker({ url, onChange, onBusyChange, orgSlug }: Props) {
  const [phase, setPhase] = useState<Phase>(url ? "filled" : "empty");
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Keep phase in sync with whether a URL is present. Lets the parent reset
  // by passing url="" and lets the URL input drive the state when typed.
  useEffect(() => {
    setPhase((p) => {
      if (p === "uploading" || p === "processing" || p === "error") return p;
      return url ? "filled" : "empty";
    });
  }, [url]);

  function reportBusy(busy: boolean) {
    onBusyChange?.(busy);
  }

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setError(null);
    setFileName(file.name);
    setPhase("uploading");
    reportBusy(true);

    const abort = new AbortController();
    abortRef.current = abort;

    try {
      const init = await initiateVideoUpload(orgSlug);
      await uploadVideoBytes(init.upload_url, file, abort.signal);

      setPhase("processing");
      const state = await pollVideoAsset(orgSlug, init.video_asset_id, { signal: abort.signal });

      if (!state.playback_ref) {
        throw new Error("Video processed but no playback URL was returned.");
      }

      const playerUrl = buildPlaybackUrl(state.provider, state.playback_ref);
      onChange({
        url: playerUrl,
        durationSeconds: state.duration_seconds ?? undefined,
      });
      setFileName(null);
      setPhase("filled");
    } catch (err) {
      if (err instanceof UploadCancelledError) {
        setFileName(null);
        setPhase(url ? "filled" : "empty");
        return;
      }
      setError(friendlyVideoError(err));
      setFileName(null);
      setPhase("error");
    } finally {
      abortRef.current = null;
      reportBusy(false);
    }
  }

  function cancelUpload() {
    abortRef.current?.abort();
  }

  function pickFile() {
    setError(null);
    fileInputRef.current?.click();
  }

  function clearVideo() {
    onChange({ url: "", durationSeconds: undefined });
    setPhase("empty");
    setError(null);
    setFileName(null);
  }

  function handleUrlChange(value: string) {
    onChange({ url: value });
    setError(null);
  }

  const detected = url ? detectVideoProvider(url) : null;

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-input bg-surface-subtle/40 p-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Video</Label>
        {phase === "filled" && detected && (
          <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="size-3.5" />
            Ready
          </span>
        )}
      </div>

      {(phase === "uploading" || phase === "processing") && (
        <div className="flex items-center justify-between gap-3 rounded-md border border-input bg-background p-3">
          <div className="flex items-center gap-3">
            <Loader2 className="size-5 animate-spin text-muted-foreground" aria-hidden />
            <div className="flex flex-col text-sm">
              <span className="font-medium">
                {phase === "uploading" ? "Uploading…" : "Processing video…"}
              </span>
              {fileName && phase === "uploading" && (
                <span className="text-xs text-muted-foreground">{fileName}</span>
              )}
              {phase === "processing" && (
                <span className="text-xs text-muted-foreground">
                  This usually takes under a minute.
                </span>
              )}
            </div>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={cancelUpload}>
            Cancel
          </Button>
        </div>
      )}

      {(phase === "empty" || phase === "error") && (
        <>
          <button
            type="button"
            onClick={pickFile}
            className="flex h-24 flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed border-input bg-background text-sm text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground"
          >
            <Upload className="size-5" />
            <span>Upload a video file</span>
            <span className="text-xs">MP4, MOV, WebM — any size Mux accepts</span>
          </button>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            <span>or paste a URL</span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="video_url" className="text-sm font-medium">
              Video URL
            </Label>
            <Input
              id="video_url"
              type="url"
              value={url}
              onChange={(e) => handleUrlChange(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=… or https://player.mux.com/…"
              className="h-11 text-base"
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}
        </>
      )}

      {phase === "filled" && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="video_url" className="text-sm font-medium">
              Video URL
            </Label>
            <div className="flex gap-2">
              <Input
                id="video_url"
                type="url"
                value={url}
                onChange={(e) => handleUrlChange(e.target.value)}
                className="h-11 text-base"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={clearVideo}
                aria-label="Remove video"
                className="h-11 w-11 shrink-0"
              >
                <X className="size-4" />
              </Button>
            </div>
          </div>

          {detected ? (
            <VideoPreview detected={detected} title="Video preview" />
          ) : (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              URL not recognised. Supported: YouTube, Vimeo, Loom, Mux, or a direct
              .mp4/.webm/.ogg/.mov link.
            </p>
          )}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        className="sr-only"
        onChange={handleFile}
        disabled={phase === "uploading" || phase === "processing"}
      />
    </div>
  );
}

function VideoPreview({
  detected,
  title,
}: {
  detected: NonNullable<ReturnType<typeof detectVideoProvider>>;
  title: string;
}) {
  if (detected.provider === "youtube") {
    const embed = youtubeEmbedSrc(detected.src);
    if (!embed) return null;
    return (
      <div data-youtube-video>
        <iframe
          src={embed}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
    );
  }
  if (detected.provider === "native") {
    return (
      <div data-video-embed="native">
        <video src={detected.src} title={title} controls preload="metadata" playsInline />
      </div>
    );
  }
  return (
    <div data-video-embed={detected.provider}>
      <iframe
        src={detected.src}
        title={title}
        allow="autoplay; fullscreen; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}

function friendlyVideoError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 503) return "Video uploads aren't configured on this instance.";
    if (err.status === 403) return "Only owners and instructors can upload videos.";
    if (err.status === 502) return "Video provider is unavailable. Try again in a moment.";
    if (err.status === 401) return "Your session expired. Sign in and try again.";
    return err.message;
  }
  if (err instanceof VideoPollError) {
    if (err.state?.status === "errored")
      return "Video processing failed. Try a different file or format.";
    return err.message;
  }
  return err instanceof Error ? err.message : "Upload failed.";
}
