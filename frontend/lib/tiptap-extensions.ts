import { Extension } from "@tiptap/core";
import type { JSONContent } from "@tiptap/core";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import Image from "@tiptap/extension-image";
import Youtube from "@tiptap/extension-youtube";
import StarterKit from "@tiptap/starter-kit";
import { common, createLowlight } from "lowlight";

import { AlgoholiaLab } from "@/lib/tiptap-lab-embed";
import { VideoEmbed } from "@/lib/tiptap-video-embed";

// Shared lowlight instance — loads ~36 common languages (python, ts, js, go,
// rust, bash, sql, yaml, json, html, css, diff, …). Same instance is used by
// the editor for live highlighting and by the server-side post-processor in
// lib/code-highlight.ts so creators and learners see identical output.
export const lowlight = createLowlight(common);

// Tab inside a codeBlock should indent (insert two spaces) instead of moving
// focus out of the block — default ProseMirror behavior is unhelpful when
// you're actually writing code. Shift-Tab dedent is intentionally deferred;
// add it when creators ask.
const CodeBlockTabHandling = Extension.create({
  name: "codeBlockTabHandling",
  addKeyboardShortcuts() {
    return {
      Tab: ({ editor }) => {
        if (!editor.isActive("codeBlock")) return false;
        return editor.commands.insertContent("  ");
      },
    };
  },
});

// CodeBlockLowlight gains a `filename` attribute that round-trips through HTML
// as `data-filename` (so generateHTML preserves it for the server-rendered
// view). The NodeView that renders the filename + language picker UI in the
// editor lives in lib/tiptap-editor-extensions.ts — it imports React and
// can't ship through this module, which has to stay safe for Server Components.
export const CodeBlock = CodeBlockLowlight.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      filename: {
        default: null,
        parseHTML: (el) => el.getAttribute("data-filename"),
        renderHTML: (attrs) => {
          const value = attrs.filename;
          return value ? { "data-filename": value } : {};
        },
      },
      // 1-indexed line numbers the creator marked as "look at this". Stored as
      // a number[] on the JSON; round-trips through HTML as a comma-separated
      // string so the SSR post-processor can read it back. See
      // lib/code-highlight.ts for the rendering pass.
      highlightedLines: {
        default: [] as number[],
        parseHTML: (el) => parseLineList(el.getAttribute("data-highlighted-lines")),
        renderHTML: (attrs) => {
          const value = attrs.highlightedLines as number[] | undefined;
          if (!value || value.length === 0) return {};
          return { "data-highlighted-lines": value.join(",") };
        },
      },
    };
  },
});

function parseLineList(value: string | null): number[] {
  if (!value) return [];
  return value
    .split(",")
    .map((s) => Number.parseInt(s.trim(), 10))
    .filter((n) => Number.isFinite(n) && n > 0);
}

// Single source of truth for the extension list shape. The editor calls this
// with a NodeView-enhanced CodeBlock; the SSR renderer uses the plain CodeBlock.
// This keeps Youtube/Image/VideoEmbed/etc. config identical across both paths.
//
// Youtube — nocookie variant (privacy-enhanced; no tracking cookies until the
// learner hits play). The width/height attributes are still emitted but the
// renderer overrides with a responsive 16:9 wrapper via [data-youtube-video].
//
// VideoEmbed — our custom node for Vimeo / Loom iframes and HTML5 <video> for
// direct .mp4 URLs. YouTube intentionally stays in its dedicated extension.
//
// AlgoholiaLab — our custom node for embedded interactive labs (algoholia.com).
// Stores {org, embedId}; rebuilds the iframe src at render time. See
// lib/tiptap-lab-embed.ts.
//
// Image — official extension. Stored as a TipTap node with `src/alt/title`;
// renders as plain <img>. Image bytes are uploaded to R2 via the backend
// (POST /uploads/image with purpose=tiptap_inline), which returns the public
// URL that we then store in the node's `src`.
export function buildExtensions(codeBlock: typeof CodeBlock = CodeBlock) {
  return [
    StarterKit.configure({ codeBlock: false }),
    codeBlock.configure({ lowlight, HTMLAttributes: { class: "hljs" } }),
    CodeBlockTabHandling,
    Youtube.configure({
      nocookie: true,
      controls: true,
      disableKBcontrols: false,
      autoplay: false,
      modestBranding: true,
    }),
    VideoEmbed,
    AlgoholiaLab,
    Image.configure({
      inline: false,
      allowBase64: false,
    }),
  ];
}

// SSR-safe extension list — what generateHTML (in Server Components) uses.
// The editor imports EDITOR_TIPTAP_EXTENSIONS from tiptap-editor-extensions.ts.
export const TIPTAP_EXTENSIONS = buildExtensions();

export const EMPTY_TIPTAP_DOC: JSONContent = {
  type: "doc",
  content: [{ type: "paragraph" }],
};
