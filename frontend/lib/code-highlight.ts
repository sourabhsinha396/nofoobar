import { toHtml as toHtmlRaw } from "hast-util-to-html";

const toHtml = toHtmlRaw;

import { lowlight } from "@/lib/tiptap-extensions";

// Tiptap's generateHTML() emits code blocks as plain <pre><code class="language-X">…</code></pre>
// with HTML-escaped text inside. The editor applies highlighting via a ProseMirror
// decoration plugin that doesn't survive into static HTML, so we run lowlight a
// second time on the rendered string and replace the inner text with highlighted
// spans. This keeps creator-view and learner-view visually identical.
//
// Regex-based rather than jsdom for dep weight — the tiptap output shape is
// well-defined (a single <code> child of <pre>, no nested elements), so the
// pattern is unambiguous. If we ever start emitting richer code-block markup
// (line wrappers, filename headers — chunk D), this should move to a proper
// HTML walker.
//
// Tiptap's CodeBlockLowlight emits `<pre class="hljs" data-filename="…"
// data-highlighted-lines="1,3"><code class="language-X">…`. We capture <pre>'s
// attribute blob so we can pull data-filename and data-highlighted-lines out,
// and read the language class from <code>.
const CODE_BLOCK_RE =
  /<pre(\s+[^>]*)?><code(?:\s+class="([^"]*)")?>([\s\S]*?)<\/code><\/pre>/g;

export function highlightCodeBlocks(html: string): string {
  return html.replace(
    CODE_BLOCK_RE,
    (
      _match,
      preAttrs: string | undefined,
      classAttr: string | undefined,
      escaped: string,
    ) => {
      const language = extractLanguage(classAttr);
      const filename = extractFilename(preAttrs);
      const highlightedLines = extractHighlightedLines(preAttrs);
      const text = decodeHtmlEntities(escaped);

      let tree: HastTree;
      try {
        tree = (language && lowlight.registered(language)
          ? lowlight.highlight(language, text)
          : lowlight.highlightAuto(text)) as HastTree;
      } catch {
        // Fall back to a flat text tree so line wrapping still works.
        tree = { type: "root", children: [{ type: "text", value: text }] };
      }

      const wrapped = wrapLines(tree, new Set(highlightedLines));
      // Our minimal Hast typing intentionally diverges from @types/hast (we
      // don't want the dep), so cast at the API boundary. The runtime shape
      // matches what toHtml expects.
      const innerHtml = toHtml(wrapped as unknown as Parameters<typeof toHtmlRaw>[0]);

      const classes = ["hljs"];
      if (language) classes.push(`language-${language}`);

      const header = filename
        ? '<div class="code-block-header">' +
          FILE_ICON_SVG +
          `<span class="code-block-filename">${escapeHtml(filename)}</span>` +
          "</div>"
        : "";

      // Wrap with a copy button + optional filename header. The button has no
      // behaviour in static HTML; CodeBlockClipboard attaches a delegated
      // click handler at mount.
      return (
        '<div class="code-block-wrapper">' +
        header +
        `<pre><code class="${classes.join(" ")}">${innerHtml}</code></pre>` +
        '<button type="button" class="code-copy" data-copy-code aria-label="Copy code">' +
        COPY_ICON_SVG +
        '<span class="code-copy-label">Copy</span>' +
        "</button>" +
        "</div>"
      );
    },
  );
}

// ---------------------------------------------------------------------------
// Hast tree line splitter
// ---------------------------------------------------------------------------

// Lowlight returns a hast tree. We use a minimal subset of the type — no need
// to pull the @types/hast dep just for this. The shape is stable.
type HastText = { type: "text"; value: string };
type HastElement = {
  type: "element";
  tagName: string;
  properties?: Record<string, unknown>;
  children: HastChild[];
};
type HastChild = HastText | HastElement;
type HastTree = { type: "root"; children: HastChild[] };

// Walk the hast tree, split into per-line trees on \n, then re-wrap each line
// in <span class="line">. Handles the corner case where a single token span
// (e.g. a multi-line string or block comment) covers more than one line — the
// token is cloned across each line it touches, preserving its class. Without
// this, naive string-splitting on \n in the rendered HTML would produce broken
// markup (unclosed/orphaned <span>) for any multi-line token.
export function wrapLines(tree: HastTree, highlighted: Set<number>): HastTree {
  const lines = splitChildren(tree.children);

  // If the source ends with a trailing newline, drop the empty final line so
  // we don't render a phantom blank highlight stripe at the bottom.
  if (lines.length > 1 && lines[lines.length - 1].length === 0) {
    lines.pop();
  }

  // Wrap each line in <span class="line"> with optional data-highlighted.
  // No "\n" text nodes between spans: CSS makes .line { display: block }, and
  // an explicit \n in <pre> (white-space: pre) would compound with the block
  // layout and produce a blank visual line between every row. Copy-to-clipboard
  // joins the line spans with "\n" itself — see lib/code-block-clipboard.ts.
  const children: HastChild[] = lines.map((line, i) => {
    const properties: Record<string, unknown> = { className: ["line"] };
    if (highlighted.has(i + 1)) properties["dataHighlighted"] = "true";
    return {
      type: "element",
      tagName: "span",
      properties,
      children: line,
    };
  });

  return { type: "root", children };
}

// Recursive splitter. Returns the children grouped per source line; lines[0]
// is the first source line, lines[n] is the (n+1)-th. Element nodes that span
// multiple lines are cloned per line with the appropriate slice of children
// and the same className/properties.
function splitChildren(children: HastChild[]): HastChild[][] {
  const result: HastChild[][] = [[]];

  for (const child of children) {
    if (child.type === "text") {
      const parts = child.value.split("\n");
      for (let i = 0; i < parts.length; i++) {
        if (parts[i].length > 0) {
          result[result.length - 1].push({ type: "text", value: parts[i] });
        }
        if (i < parts.length - 1) result.push([]);
      }
    } else {
      const innerLines = splitChildren(child.children);
      for (let i = 0; i < innerLines.length; i++) {
        if (innerLines[i].length > 0) {
          const clone: HastElement = {
            type: "element",
            tagName: child.tagName,
            properties: child.properties ? { ...child.properties } : undefined,
            children: innerLines[i],
          };
          result[result.length - 1].push(clone);
        }
        if (i < innerLines.length - 1) result.push([]);
      }
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractLanguage(classAttr: string | undefined): string | null {
  if (!classAttr) return null;
  const match = classAttr.match(/\blanguage-([\w-]+)\b/);
  return match ? match[1] : null;
}

function extractFilename(preAttrs: string | undefined): string | null {
  if (!preAttrs) return null;
  const match = preAttrs.match(/\bdata-filename="([^"]*)"/);
  if (!match) return null;
  return decodeHtmlEntities(match[1]) || null;
}

function extractHighlightedLines(preAttrs: string | undefined): number[] {
  if (!preAttrs) return [];
  const match = preAttrs.match(/\bdata-highlighted-lines="([^"]*)"/);
  if (!match) return [];
  return match[1]
    .split(",")
    .map((s) => Number.parseInt(s.trim(), 10))
    .filter((n) => Number.isFinite(n) && n > 0);
}

// HTML-escape user-supplied filename text for safe inclusion in the rendered
// markup. Filename comes through the JSON doc, so it's already trusted in the
// "this creator set it" sense — but we still escape to be defence-in-depth
// against bad/legacy data.
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Tiptap escapes the four characters we care about: & < > ". Anything more
// exotic would need a full entity table; not worth it for code text.
const ENTITY_MAP: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
};

function decodeHtmlEntities(s: string): string {
  return s.replace(/&(?:amp|lt|gt|quot|#39);/g, (m) => ENTITY_MAP[m]);
}

// Inline SVG keeps the post-processor self-contained (no React import). Width
// is set by CSS so the icon scales with the button text.
const COPY_ICON_SVG =
  '<svg class="code-copy-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>' +
  '<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>' +
  "</svg>";

// Lucide "File" icon — generic file glyph rendered next to the filename in
// the code-block header chip.
const FILE_ICON_SVG =
  '<svg class="code-block-header-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/>' +
  '<path d="M14 2v6h6"/>' +
  "</svg>";
