"use client";

import type { Node as PMNode } from "@tiptap/pm/model";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { ReactNodeViewRenderer } from "@tiptap/react";

import { CodeBlockNodeView } from "@/components/lesson/code-block-node-view";
import { CodeBlock, buildExtensions } from "@/lib/tiptap-extensions";

// Editor-only extension list - adds the React NodeView to CodeBlock so the
// editor renders the filename + language picker toolbar, plus a ProseMirror
// plugin that visualises highlighted lines while editing. The NodeView pulls
// in React internals from @tiptap/react which aren't safe in Server Components,
// so this module is gated with "use client" and is NOT imported by anything in
// the renderer path (article-renderer.tsx uses TIPTAP_EXTENSIONS instead).

const lineHighlightKey = new PluginKey("code-block-line-highlight");

// Walk every codeBlock in the doc and emit an inline decoration for each line
// listed in its highlightedLines attribute. The decoration's class is styled
// in globals.css as a text-width background tint - see the chunk D rationale
// in lib/code-block-line-helpers.ts for why we don't go full-bleed in the
// editor.
function buildLineHighlightDecorations(doc: PMNode): DecorationSet {
  const decos: Decoration[] = [];
  doc.descendants((node, pos) => {
    if (node.type.name !== "codeBlock") return;
    const raw = node.attrs.highlightedLines;
    if (!Array.isArray(raw) || raw.length === 0) return;

    const lineSet = new Set<number>(raw.filter((n) => Number.isFinite(n) && n > 0));
    if (lineSet.size === 0) return;

    // Code block content sits at pos+1 onwards (pos points to the opening tag).
    const text = node.textContent;
    let lineIdx = 1;
    let lineStart = 0;
    for (let i = 0; i <= text.length; i++) {
      const atEnd = i === text.length;
      if (atEnd || text[i] === "\n") {
        if (lineSet.has(lineIdx) && i > lineStart) {
          const from = pos + 1 + lineStart;
          const to = pos + 1 + i;
          decos.push(Decoration.inline(from, to, { class: "cm-line-highlighted" }));
        }
        lineIdx++;
        lineStart = i + 1;
      }
    }
  });
  return DecorationSet.create(doc, decos);
}

function lineHighlightPlugin(): Plugin {
  return new Plugin({
    key: lineHighlightKey,
    state: {
      init: (_, { doc }) => buildLineHighlightDecorations(doc),
      apply: (tr, old) =>
        tr.docChanged ? buildLineHighlightDecorations(tr.doc) : old,
    },
    props: {
      decorations(state) {
        return this.getState(state);
      },
    },
  });
}

const CodeBlockWithNodeView = CodeBlock.extend({
  addNodeView() {
    return ReactNodeViewRenderer(CodeBlockNodeView);
  },
  addProseMirrorPlugins() {
    return [...(this.parent?.() ?? []), lineHighlightPlugin()];
  },
});

export const EDITOR_TIPTAP_EXTENSIONS = buildExtensions(CodeBlockWithNodeView);
