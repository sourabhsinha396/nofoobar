"use client";

import { Image as ImageIcon, Upload, X } from "lucide-react";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api";

// Relative paths - proxied to the backend by app/api/v1/[...path]/route.ts.
const API_URL = "";

// Client-side pre-check before sending the request - the backend is the
// authoritative cap (matches s3.MAX_UPLOAD_BYTES on the server).
const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;

interface UploadResponse {
  public_url: string;
}

// Mirrors backend `app.services.storage.s3.ImagePurpose`. The backend
// requires this field on every upload - no default - so the bucket path
// is meaningful (`uploads/images/<purpose>/…`).
export type ImagePurpose = "organization_logo" | "course_logo" | "tiptap_inline";

export interface LogoUploaderProps {
  orgSlug: string;
  value: string;
  onChange: (url: string) => void;
  purpose: ImagePurpose;
}

type Mode = "upload" | "url";

// XHR (not fetch) so we can listen to upload-progress events. fetch doesn't
// expose those without ReadableStream gymnastics that aren't worth the
// complexity for 2 MB images.
function postFile(
  url: string,
  file: File,
  orgSlug: string,
  purpose: ImagePurpose,
  onProgress: (pct: number) => void,
): Promise<UploadResponse> {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append("file", file);
    form.append("purpose", purpose);

    const xhr = new XMLHttpRequest();
    xhr.upload.addEventListener("progress", (evt) => {
      if (evt.lengthComputable) {
        onProgress(Math.round((evt.loaded / evt.total) * 100));
      }
    });
    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText) as UploadResponse);
        } catch {
          reject(new Error("Invalid server response"));
        }
        return;
      }
      let detail = `HTTP ${xhr.status}`;
      try {
        const data = JSON.parse(xhr.responseText);
        if (typeof data.detail === "string") detail = data.detail;
      } catch {
        // keep the generic detail
      }
      reject(new ApiError(xhr.status, detail));
    });
    xhr.addEventListener("error", () => reject(new Error("Network error during upload")));
    xhr.open("POST", url);
    xhr.withCredentials = true;
    xhr.setRequestHeader("X-Tenant-Slug", orgSlug);
    xhr.send(form);
  });
}

export function LogoUploader({ orgSlug, value, onChange, purpose }: LogoUploaderProps) {
  const [mode, setMode] = useState<Mode>("upload");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    // Clear the input so re-selecting the same file fires onChange again.
    event.target.value = "";

    setError(null);
    setProgress(0);

    if (file.size > MAX_UPLOAD_BYTES) {
      const mb = Math.round(MAX_UPLOAD_BYTES / 1024 / 1024);
      setError(`File too large. Max ${mb} MB.`);
      return;
    }

    setUploading(true);
    try {
      const response = await postFile(
        `${API_URL}/api/v1/uploads/image`,
        file,
        orgSlug,
        purpose,
        setProgress,
      );
      onChange(response.public_url);
      setProgress(0);
    } catch (err) {
      if (err instanceof ApiError && err.status === 503) {
        // Backend is up but R2 isn't configured. Fall back to URL paste so
        // the form is still usable.
        setMode("url");
        setError("Uploads aren't configured on this instance. Paste a URL instead.");
      } else if (err instanceof ApiError && err.status === 413) {
        setError("File too large.");
      } else if (err instanceof ApiError && err.status === 422) {
        setError("Only PNG, JPG, and GIF files are allowed.");
      } else if (err instanceof ApiError && err.status === 403) {
        setError("Only owners and instructors can upload images.");
      } else {
        setError(err instanceof Error ? err.message : "Upload failed.");
      }
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Label className="text-sm font-medium">
        Cover image <span className="text-muted-foreground">(optional)</span>
      </Label>

      {mode === "upload" ? (
        <div className="flex items-start gap-4">
          {value ? (
            <div className="relative size-24 shrink-0 overflow-hidden rounded-md border bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element -- arbitrary user-supplied URL; swap to next/image once we restrict to our R2 host */}
              <img
                src={value}
                alt="Cover preview"
                className="h-full w-full object-cover"
              />
              <button
                type="button"
                onClick={() => onChange("")}
                className="absolute right-0 top-0 rounded-bl-md bg-background/85 p-1 text-foreground hover:bg-background"
                aria-label="Remove image"
              >
                <X className="size-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex size-24 shrink-0 items-center justify-center rounded-md border border-dashed bg-muted text-muted-foreground">
              <ImageIcon className="size-7" aria-hidden />
            </div>
          )}

          <div className="flex flex-col items-start gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              <Upload className="size-4" />
              {uploading
                ? progress > 0
                  ? `Uploading… ${progress}%`
                  : "Uploading…"
                : value
                  ? "Replace"
                  : "Upload"}
            </Button>
            <button
              type="button"
              className="text-xs text-muted-foreground underline-offset-4 hover:underline"
              onClick={() => setMode("url")}
            >
              Or paste a URL instead
            </button>
            <p className="text-xs text-muted-foreground">PNG, JPG, GIF. Up to 2 MB.</p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/gif"
            className="sr-only"
            onChange={handleFileChange}
          />
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          <Input
            type="url"
            placeholder="https://example.com/cover.png"
            maxLength={500}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="h-11 text-base"
          />
          <button
            type="button"
            className="self-start text-xs text-muted-foreground underline-offset-4 hover:underline"
            onClick={() => {
              setError(null);
              setMode("upload");
            }}
          >
            Or upload a file
          </button>
        </div>
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}
