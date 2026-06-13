import { generateHTML } from "@tiptap/html";
import type { JSONContent } from "@tiptap/react";

import { CodeBlockClipboard } from "@/components/lesson/code-block-clipboard";
import { highlightCodeBlocks } from "@/lib/code-highlight";
import { TIPTAP_EXTENSIONS } from "@/lib/tiptap-extensions";

interface Props {
  doc: JSONContent;
}

/* Authoring leaves "accidental" empty nodes behind: a heading whose text got
   deleted, or list items holding nothing but an empty paragraph (which render
   as a bare "3."). Those are pruned before serialization. Empty top-level
   paragraphs are kept on purpose — authors type blank lines for breathing
   room, and globals.css gives them one line of height to match the editor. */
const TEXT_CONTAINER_TYPES = new Set([
  "paragraph",
  "heading",
  "listItem",
  "bulletList",
  "orderedList",
  "blockquote",
]);

function hasRenderableContent(node: JSONContent): boolean {
  if (node.type === "text") return Boolean(node.text && node.text.trim());
  if (node.type === "hardBreak") return false;
  if (TEXT_CONTAINER_TYPES.has(node.type ?? "")) {
    return (node.content ?? []).some(hasRenderableContent);
  }
  // Anything else (image, codeBlock, video/lab embeds, …) is meaningful as-is.
  return true;
}

function pruneEmptyNodes(node: JSONContent): JSONContent {
  if (!node.content) return node;
  const content = node.content.map(pruneEmptyNodes).filter((child) => {
    if (child.type === "heading" || child.type === "listItem") {
      return hasRenderableContent(child);
    }
    if (child.type === "bulletList" || child.type === "orderedList") {
      return (child.content ?? []).length > 0;
    }
    return true;
  });
  return { ...node, content };
}

// Server-rendered HTML from a TipTap/ProseMirror JSON doc. The shared extension
// set with the editor (lib/tiptap-extensions.ts) guarantees the renderer can
// serialize anything the editor produces. Code blocks get a second pass through
// lowlight so syntax highlighting matches what the editor shows, and are wrapped
// with a copy-to-clipboard button. CodeBlockClipboard is a thin client wrapper
// that attaches the click delegate post-hydration.
export function ArticleRenderer({ doc }: Props) {
  const html = highlightCodeBlocks(generateHTML(pruneEmptyNodes(doc), TIPTAP_EXTENSIONS));
  return (
    <CodeBlockClipboard>
      <article
        className="prose prose-neutral max-w-none dark:prose-invert"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </CodeBlockClipboard>
  );
}
