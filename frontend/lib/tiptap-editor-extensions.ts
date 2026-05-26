"use client";

import { ReactNodeViewRenderer } from "@tiptap/react";

import { CodeBlockNodeView } from "@/components/lesson/code-block-node-view";
import { CodeBlock, buildExtensions } from "@/lib/tiptap-extensions";

// Editor-only extension list — adds the React NodeView to CodeBlock so the
// editor renders the filename + language picker toolbar. The NodeView pulls in
// React internals from @tiptap/react which aren't safe in Server Components,
// so this module is gated with "use client" and is NOT imported by anything in
// the renderer path (article-renderer.tsx uses TIPTAP_EXTENSIONS instead).
const CodeBlockWithNodeView = CodeBlock.extend({
  addNodeView() {
    return ReactNodeViewRenderer(CodeBlockNodeView);
  },
});

export const EDITOR_TIPTAP_EXTENSIONS = buildExtensions(CodeBlockWithNodeView);
