"use client";

import { EditorContent, useEditor, type Editor, type JSONContent } from "@tiptap/react";
import { Bold, Code2, Heading1, Italic, List } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TIPTAP_EXTENSIONS } from "@/lib/tiptap-extensions";

interface Props {
  value: JSONContent;
  onChange: (value: JSONContent) => void;
  id?: string;
}

interface ToolbarButtonProps {
  onClick: () => void;
  isActive: boolean;
  label: string;
  children: React.ReactNode;
}

function ToolbarButton({ onClick, isActive, label, children }: ToolbarButtonProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onClick}
      aria-label={label}
      aria-pressed={isActive}
      className={cn(
        "h-8 w-8 p-0",
        isActive && "bg-accent text-foreground",
      )}
    >
      {children}
    </Button>
  );
}

function Toolbar({ editor }: { editor: Editor | null }) {
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
    </div>
  );
}

export function ArticleEditor({ value, onChange, id }: Props) {
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

  return (
    <div className="rounded-md border border-input bg-background">
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}
