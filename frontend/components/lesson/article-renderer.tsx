import { generateHTML } from "@tiptap/html";
import type { JSONContent } from "@tiptap/react";

import { TIPTAP_EXTENSIONS } from "@/lib/tiptap-extensions";

interface Props {
  doc: JSONContent;
}

// Server-rendered HTML from a TipTap/ProseMirror JSON doc. The shared extension
// set with the editor (lib/tiptap-extensions.ts) guarantees the renderer can
// serialize anything the editor produces.
export function ArticleRenderer({ doc }: Props) {
  const html = generateHTML(doc, TIPTAP_EXTENSIONS);
  return (
    <article
      className="prose prose-neutral max-w-none dark:prose-invert"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
