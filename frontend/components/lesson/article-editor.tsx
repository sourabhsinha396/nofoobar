"use client";

import { EditorContent, useEditor, type Editor, type JSONContent } from "@tiptap/react";
import {
  Bold,
  Code2,
  FlaskConical,
  Heading,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Heading5,
  Heading6,
  ImagePlus,
  Italic,
  List,
  Loader2,
  Play,
  Upload,
  type LucideIcon,
} from "lucide-react";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { EDITOR_TIPTAP_EXTENSIONS } from "@/lib/tiptap-editor-extensions";
import { type ParsedLabEmbed, parseLabEmbed } from "@/lib/tiptap-lab-embed";
import { detectVideoProvider } from "@/lib/tiptap-video-embed";
import {
  UploadCancelledError,
  VideoPollError,
  buildPlaybackUrl,
  initiateVideoUpload,
  pollVideoAsset,
  uploadVideoBytes,
} from "@/lib/video-upload";

// Relative paths - proxied to the backend by app/api/v1/[...path]/route.ts.
const API_URL = "";
const IMAGE_MAX_BYTES = 2 * 1024 * 1024;
const IMAGE_ACCEPT = "image/png,image/jpeg,image/gif";

interface ImageUploadResponse {
  public_url: string;
}

async function uploadImage(file: File, orgSlug: string): Promise<ImageUploadResponse> {
  const form = new FormData();
  form.append("file", file);
  form.append("purpose", "tiptap_inline");

  const response = await fetch(`${API_URL}/api/v1/uploads/image`, {
    method: "POST",
    credentials: "include",
    headers: { "X-Tenant-Slug": orgSlug },
    body: form,
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({ detail: `HTTP ${response.status}` }));
    throw new ApiError(response.status, data.detail ?? `HTTP ${response.status}`);
  }
  return (await response.json()) as ImageUploadResponse;
}

interface Props {
  value: JSONContent;
  onChange: (value: JSONContent) => void;
  orgSlug: string;
  id?: string;
}

interface ToolbarButtonProps {
  onClick: () => void;
  isActive?: boolean;
  label: string;
  children: React.ReactNode;
}

function ToolbarButton({ onClick, isActive = false, label, children }: ToolbarButtonProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onClick}
      aria-label={label}
      aria-pressed={isActive}
      className={cn("h-8 w-8 p-0", isActive && "bg-accent text-foreground")}
    >
      {children}
    </Button>
  );
}

const HEADING_LEVELS = [1, 2, 3, 4, 5, 6] as const;
type HeadingLevel = (typeof HEADING_LEVELS)[number];

const HEADING_ICONS: Record<HeadingLevel, LucideIcon> = {
  1: Heading1,
  2: Heading2,
  3: Heading3,
  4: Heading4,
  5: Heading5,
  6: Heading6,
};

function HeadingMenu({ editor }: { editor: Editor }) {
  const activeLevel = HEADING_LEVELS.find((level) => editor.isActive("heading", { level }));
  const TriggerIcon = activeLevel ? HEADING_ICONS[activeLevel] : Heading;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label="Heading"
          aria-pressed={Boolean(activeLevel)}
          className={cn("h-8 w-8 p-0", activeLevel && "bg-accent text-foreground")}
        >
          <TriggerIcon className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {HEADING_LEVELS.map((level) => {
          const Icon = HEADING_ICONS[level];
          const isActive = editor.isActive("heading", { level });
          return (
            <DropdownMenuItem
              key={level}
              onSelect={() => editor.chain().focus().toggleHeading({ level }).run()}
              className={cn(isActive && "bg-accent text-foreground")}
            >
              <Icon className="size-4" />
              Heading {level}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface ToolbarProps {
  editor: Editor | null;
  onOpenVideo: () => void;
  onOpenLab: () => void;
  onPickImage: () => void;
  isUploadingImage: boolean;
}

function Toolbar({ editor, onOpenVideo, onOpenLab, onPickImage, isUploadingImage }: ToolbarProps) {
  if (!editor) return null;
  return (
    <div className="flex items-center gap-1 border-b border-input p-1">
      <HeadingMenu editor={editor} />
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={editor.isActive("bold")}
        label="Bold"
      >
        <Bold className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={editor.isActive("italic")}
        label="Italic"
      >
        <Italic className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        isActive={editor.isActive("bulletList")}
        label="Bullet list"
      >
        <List className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        isActive={editor.isActive("codeBlock")}
        label="Code block"
      >
        <Code2 className="size-4" />
      </ToolbarButton>
      <span className="mx-1 h-5 w-px bg-border" aria-hidden />
      <ToolbarButton
        onClick={onPickImage}
        label={isUploadingImage ? "Uploading image…" : "Upload image"}
      >
        <ImagePlus
          className={cn("size-4", isUploadingImage && "animate-pulse text-muted-foreground")}
        />
      </ToolbarButton>
      <ToolbarButton onClick={onOpenVideo} label="Embed video">
        <Play className="size-4" />
      </ToolbarButton>
      <ToolbarButton onClick={onOpenLab} label="Embed lab">
        <FlaskConical className="size-4" />
      </ToolbarButton>
    </div>
  );
}

interface VideoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInsert: (detected: NonNullable<ReturnType<typeof detectVideoProvider>>) => void;
  orgSlug: string;
}

type UploadPhase = "idle" | "uploading" | "processing";

function VideoDialog({ open, onOpenChange, onInsert, orgSlug }: VideoDialogProps) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<UploadPhase>("idle");
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  function reset() {
    setUrl("");
    setError(null);
    setPhase("idle");
    setFileName(null);
    abortRef.current = null;
  }

  function submitUrl(event: React.FormEvent) {
    event.preventDefault();
    // React Portal gotcha: even though Radix moves the dialog DOM to body,
    // React synthetic events still bubble through the React component
    // tree. Without stopPropagation, this submit bubbles up to the
    // surrounding LessonForm's <form>, triggering its onSubmit (a PATCH
    // + navigation away from the page).
    event.stopPropagation();
    const detected = detectVideoProvider(url);
    if (!detected) {
      setError(
        "Unrecognized URL. Supported: YouTube, Vimeo, Loom, Mux, or a direct .mp4/.webm/.ogg/.mov link.",
      );
      return;
    }
    onInsert(detected);
    reset();
    onOpenChange(false);
  }

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setError(null);
    setFileName(file.name);
    setPhase("uploading");
    const abort = new AbortController();
    abortRef.current = abort;

    try {
      const init = await initiateVideoUpload(orgSlug);
      await uploadVideoBytes(init.upload_url, file, abort.signal);

      setPhase("processing");
      const state = await pollVideoAsset(orgSlug, init.video_asset_id, {
        signal: abort.signal,
      });

      if (!state.playback_ref) {
        throw new Error("Video processed but no playback URL was returned.");
      }

      onInsert({
        provider: "mux",
        src: buildPlaybackUrl(state.provider, state.playback_ref),
      });
      reset();
      onOpenChange(false);
    } catch (err) {
      if (err instanceof UploadCancelledError) {
        reset();
        return;
      }
      setError(friendlyVideoError(err));
      setPhase("idle");
      setFileName(null);
    } finally {
      abortRef.current = null;
    }
  }

  function cancelUpload() {
    abortRef.current?.abort();
  }

  function handleOpenChange(next: boolean) {
    if (!next) {
      // Closing the dialog cancels any in-flight upload. The provider gets
      // a stranded asset; the backend's pending-stuck sweeper handles cleanup.
      abortRef.current?.abort();
      reset();
    }
    onOpenChange(next);
  }

  const isBusy = phase !== "idle";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add video</DialogTitle>
          <DialogDescription>
            Upload a video file, or paste a YouTube, Vimeo, Loom, Mux, or direct .mp4/.webm URL.
          </DialogDescription>
        </DialogHeader>

        {phase === "idle" ? (
          <div className="flex flex-col gap-4">
            <Button
              type="button"
              variant="outline"
              className="h-20 flex-col gap-1"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="size-5" />
              <span>Upload a video file</span>
            </Button>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-border" />
              <span>or paste a URL</span>
              <span className="h-px flex-1 bg-border" />
            </div>

            <form onSubmit={submitUrl} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="video-url" className="sr-only">
                  URL
                </Label>
                <Input
                  id="video-url"
                  type="url"
                  placeholder="https://www.youtube.com/watch?v=… or https://player.mux.com/…"
                  value={url}
                  onChange={(e) => {
                    setUrl(e.target.value);
                    if (error) setError(null);
                  }}
                  autoFocus
                />
                {error && <p className="text-sm text-red-500">{error}</p>}
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit">Insert</Button>
              </DialogFooter>
            </form>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3 rounded-md border border-input bg-muted/40 p-3">
              <Loader2 className="size-5 animate-spin text-muted-foreground" aria-hidden />
              <div className="flex flex-col text-sm">
                <span className="font-medium">
                  {phase === "uploading" ? "Uploading…" : "Processing video…"}
                </span>
                {fileName && <span className="text-xs text-muted-foreground">{fileName}</span>}
                {phase === "processing" && (
                  <span className="text-xs text-muted-foreground">
                    This usually takes under a minute.
                  </span>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={cancelUpload}>
                Cancel upload
              </Button>
            </DialogFooter>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          className="sr-only"
          onChange={handleFile}
          disabled={isBusy}
        />
      </DialogContent>
    </Dialog>
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

interface LabDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInsert: (parsed: ParsedLabEmbed) => void;
}

function LabDialog({ open, onOpenChange, onInsert }: LabDialogProps) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedLabEmbed | null>(null);

  function reset() {
    setCode("");
    setError(null);
    setParsed(null);
  }

  function handleChange(value: string) {
    setCode(value);
    setError(null);
    // Live preview of what we detected, so the creator sees the lab is valid
    // before inserting.
    setParsed(value.trim() ? parseLabEmbed(value) : null);
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    // See the matching note in VideoDialog.submitUrl - stop the submit from
    // bubbling to the surrounding LessonForm's <form>.
    event.stopPropagation();
    const result = parseLabEmbed(code);
    if (!result) {
      setError("Couldn't find an algoholia lab embed. Paste the iframe code from the lab page.");
      return;
    }
    onInsert(result);
    reset();
    onOpenChange(false);
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Embed a lab</DialogTitle>
          <DialogDescription>
            Paste the embed code from your algoholia lab. We&apos;ll detect it and render it inline.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="lab-embed-code" className="sr-only">
              Lab embed code
            </Label>
            <textarea
              id="lab-embed-code"
              rows={4}
              placeholder='<iframe src="https://algoholia.com/fastapi/embed/…" …></iframe>'
              value={code}
              onChange={(e) => handleChange(e.target.value)}
              autoFocus
              className={cn(
                "w-full resize-none rounded-md border border-input bg-background px-3 py-2",
                "font-mono text-sm focus:outline-none focus:ring-2 focus:ring-ring",
              )}
            />
            {parsed && (
              <p className="text-sm text-muted-foreground">
                Detected lab <span className="font-medium text-foreground">{parsed.org}</span>{" "}
                · <code className="text-xs">{parsed.embedId}</code>
              </p>
            )}
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!parsed}>
              Insert
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ArticleEditor({ value, onChange, orgSlug, id }: Props) {
  const [videoOpen, setVideoOpen] = useState(false);
  const [labOpen, setLabOpen] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: EDITOR_TIPTAP_EXTENSIONS,
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getJSON());
    },
    // Disable SSR-immediate render: TipTap recommends this in Next.js to avoid
    // hydration mismatches on the editor's contenteditable element.
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: cn(
          "prose prose-neutral max-w-none dark:prose-invert",
          "min-h-[200px] px-3 py-2 focus:outline-none",
        ),
        ...(id ? { id } : {}),
      },
    },
  });

  function insertVideo(detected: NonNullable<ReturnType<typeof detectVideoProvider>>) {
    if (!editor) return;
    // YouTube has its own dedicated extension (better defaults - nocookie,
    // controls, etc.). Everything else goes through our VideoEmbed node.
    if (detected.provider === "youtube") {
      editor.chain().focus().setYoutubeVideo({ src: detected.src }).run();
    } else {
      editor
        .chain()
        .focus()
        .setVideoEmbed({ src: detected.src, provider: detected.provider })
        .run();
    }
  }

  function insertLab(parsed: ParsedLabEmbed) {
    if (!editor) return;
    editor.chain().focus().setAlgoholiaLab(parsed).run();
  }

  // Blur the editor before opening the dialog. Without this, the focused
  // ProseMirror node is a descendant of the sidebar-wrapper that Radix
  // marks aria-hidden when the modal opens - Chrome's a11y validator
  // flags the resulting "focused element inside aria-hidden ancestor"
  // contradiction. Blurring lets focus move cleanly into the dialog.
  function openVideoDialog() {
    editor?.commands.blur();
    setVideoOpen(true);
  }

  function openLabDialog() {
    editor?.commands.blur();
    setLabOpen(true);
  }

  function pickImage() {
    setImageError(null);
    fileInputRef.current?.click();
  }

  async function handleImageFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Reset value immediately so picking the same file twice still fires onChange.
    event.target.value = "";
    if (!file || !editor) return;

    if (file.size > IMAGE_MAX_BYTES) {
      const mb = Math.round(IMAGE_MAX_BYTES / 1024 / 1024);
      setImageError(`Image too large. Max ${mb} MB.`);
      return;
    }

    setImageUploading(true);
    try {
      const { public_url } = await uploadImage(file, orgSlug);
      editor.chain().focus().setImage({ src: public_url }).run();
    } catch (err) {
      if (err instanceof ApiError && err.status === 503) {
        setImageError("Uploads aren't configured on this instance.");
      } else if (err instanceof ApiError && err.status === 422) {
        setImageError("Only PNG, JPG, and GIF files are allowed.");
      } else if (err instanceof ApiError && err.status === 413) {
        setImageError("Image too large.");
      } else if (err instanceof ApiError && err.status === 403) {
        setImageError("Only owners and instructors can upload images.");
      } else {
        setImageError(err instanceof Error ? err.message : "Upload failed.");
      }
    } finally {
      setImageUploading(false);
    }
  }

  return (
    <div className="rounded-md border border-input bg-background">
      <Toolbar
        editor={editor}
        onOpenVideo={openVideoDialog}
        onOpenLab={openLabDialog}
        onPickImage={pickImage}
        isUploadingImage={imageUploading}
      />
      <EditorContent editor={editor} />
      <input
        ref={fileInputRef}
        type="file"
        accept={IMAGE_ACCEPT}
        className="sr-only"
        onChange={handleImageFile}
      />
      {imageError && (
        <p className="border-t border-input px-3 py-2 text-sm text-red-500">{imageError}</p>
      )}
      <VideoDialog
        open={videoOpen}
        onOpenChange={setVideoOpen}
        onInsert={insertVideo}
        orgSlug={orgSlug}
      />
      <LabDialog open={labOpen} onOpenChange={setLabOpen} onInsert={insertLab} />
    </div>
  );
}
