"use client";

import { EditorContent, useEditor, type Editor, type JSONContent } from "@tiptap/react";
import { Bold, Code2, Heading1, Italic, List, Play } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { TIPTAP_EXTENSIONS } from "@/lib/tiptap-extensions";
import { detectVideoProvider } from "@/lib/tiptap-video-embed";

interface Props {
  value: JSONContent;
  onChange: (value: JSONContent) => void;
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

interface ToolbarProps {
  editor: Editor | null;
  onOpenVideo: () => void;
}

function Toolbar({ editor, onOpenVideo }: ToolbarProps) {
  if (!editor) return null;
  return (
    <div className="flex items-center gap-1 border-b border-input p-1">
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        isActive={editor.isActive("heading", { level: 1 })}
        label="Heading 1"
      >
        <Heading1 className="size-4" />
      </ToolbarButton>
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
      <ToolbarButton onClick={onOpenVideo} label="Embed video">
        <Play className="size-4" />
      </ToolbarButton>
    </div>
  );
}

interface VideoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInsert: (detected: NonNullable<ReturnType<typeof detectVideoProvider>>) => void;
}

function VideoDialog({ open, onOpenChange, onInsert }: VideoDialogProps) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setUrl("");
    setError(null);
  }

  function submit(event: React.FormEvent) {
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
        "Unrecognized URL. Supported: YouTube, Vimeo, Loom, or a direct .mp4/.webm/.ogg/.mov link.",
      );
      return;
    }
    onInsert(detected);
    reset();
    onOpenChange(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Embed video</DialogTitle>
          <DialogDescription>
            Paste a YouTube, Vimeo, or Loom link, or a direct .mp4/.webm URL.
            YouTube embeds use the privacy-enhanced (no-cookie) variant.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="video-url">URL</Label>
            <Input
              id="video-url"
              type="url"
              placeholder="https://www.youtube.com/watch?v=… or https://vimeo.com/… or https://…/video.mp4"
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
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Insert</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ArticleEditor({ value, onChange, id }: Props) {
  const [videoOpen, setVideoOpen] = useState(false);

  const editor = useEditor({
    extensions: TIPTAP_EXTENSIONS,
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
    // YouTube has its own dedicated extension (better defaults — nocookie,
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

  // Blur the editor before opening the dialog. Without this, the focused
  // ProseMirror node is a descendant of the sidebar-wrapper that Radix
  // marks aria-hidden when the modal opens — Chrome's a11y validator
  // flags the resulting "focused element inside aria-hidden ancestor"
  // contradiction. Blurring lets focus move cleanly into the dialog.
  function openVideoDialog() {
    editor?.commands.blur();
    setVideoOpen(true);
  }

  return (
    <div className="rounded-md border border-input bg-background">
      <Toolbar editor={editor} onOpenVideo={openVideoDialog} />
      <EditorContent editor={editor} />
      <VideoDialog open={videoOpen} onOpenChange={setVideoOpen} onInsert={insertVideo} />
    </div>
  );
}
