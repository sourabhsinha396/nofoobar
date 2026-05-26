import { toHtml } from "hast-util-to-html";

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
// Tiptap's CodeBlockLowlight emits `<pre class="hljs" data-filename="…">
// <code class="language-X">…`. We capture <pre>'s attribute blob so we can
// pull data-filename out, and read the language class from <code>.
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
      const text = decodeHtmlEntities(escaped);

      let innerHtml: string;
      try {
        const tree = language && lowlight.registered(language)
          ? lowlight.highlight(language, text)
          : lowlight.highlightAuto(text);
        innerHtml = toHtml(tree);
      } catch {
        // Fall back to the escaped text — better to show plain code than to
        // break the page if lowlight throws on weird input.
        innerHtml = escaped;
      }

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

function extractLanguage(classAttr: string | undefined): string | null {
  if (!classAttr) return null;
  const match = classAttr.match(/\blanguage-([\w-]+)\b/);
  return match ? match[1] : null;
}

function extractFilename(preAttrs: string | undefined): string | null {
  if (!preAttrs) return null;
  const match = preAttrs.match(/\bdata-filename="([^"]*)"/);
  if (!match) return null;
  // Tiptap renderHTML escapes attribute values, so decode back to the original.
  return decodeHtmlEntities(match[1]) || null;
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
