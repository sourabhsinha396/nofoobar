import { generateHTML } from "@tiptap/html";
import type { JSONContent } from "@tiptap/react";

import { CodeBlockClipboard } from "@/components/lesson/code-block-clipboard";
import { highlightCodeBlocks } from "@/lib/code-highlight";
import { TIPTAP_EXTENSIONS } from "@/lib/tiptap-extensions";

interface Props {
  doc: JSONContent;
}

// Server-rendered HTML from a TipTap/ProseMirror JSON doc. The shared extension
// set with the editor (lib/tiptap-extensions.ts) guarantees the renderer can
// serialize anything the editor produces. Code blocks get a second pass through
// lowlight so syntax highlighting matches what the editor shows, and are wrapped
// with a copy-to-clipboard button. CodeBlockClipboard is a thin client wrapper
// that attaches the click delegate post-hydration.
export function ArticleRenderer({ doc }: Props) {
  const html = highlightCodeBlocks(generateHTML(doc, TIPTAP_EXTENSIONS));
  return (
    <CodeBlockClipboard>
      <article
        className="prose prose-neutral max-w-none dark:prose-invert"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </CodeBlockClipboard>
  );
}
