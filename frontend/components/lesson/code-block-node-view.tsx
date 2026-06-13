"use client";

import { NodeViewContent, NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { Highlighter } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import {
  lineRangeForOffsets,
  toggleLineRange,
} from "@/lib/code-block-line-helpers";

// React NodeView for code blocks in the editor. Replaces the default ProseMirror
// rendering with a toolbar (filename input + line-highlight toggle + language
// dropdown) above the editable code area. The toolbar is contentEditable=false
// so creators can't accidentally type into it. Server-side rendering uses
// extension.renderHTML instead - see lib/code-highlight.ts for the matching
// display chip and per-line highlight stripes.
export function CodeBlockNodeView({
  node,
  updateAttributes,
  extension,
  editor,
  getPos,
}: NodeViewProps) {
  const language: string | null = node.attrs.language ?? null;
  const filename: string | null = node.attrs.filename ?? null;
  const highlightedLines: number[] = useMemo(() => {
    const raw = node.attrs.highlightedLines;
    return Array.isArray(raw) ? raw.filter((n) => Number.isFinite(n) && n > 0) : [];
  }, [node.attrs.highlightedLines]);

  // Filename is committed on blur rather than per-keystroke - every transaction
  // forces ProseMirror to recompute decorations including the syntax-highlight
  // overlay, which is jank for typing.
  const [localFilename, setLocalFilename] = useState(filename ?? "");
  useEffect(() => {
    setLocalFilename(filename ?? "");
  }, [filename]);

  const languages = useMemo<string[]>(() => {
    const lowlight = extension.options.lowlight as
      | { listLanguages?: () => string[] }
      | undefined;
    const list = lowlight?.listLanguages?.() ?? [];
    return [...list].sort();
  }, [extension.options.lowlight]);

  function toggleHighlightForSelection() {
    const pos = getPos?.();
    if (typeof pos !== "number") return;
    const { from, to } = editor.state.selection;
    // Code block text content starts at pos+1; convert document positions to
    // in-block character offsets.
    const textStart = pos + 1;
    const fromOffset = from - textStart;
    const toOffset = to - textStart;
    const range = lineRangeForOffsets(node.textContent, fromOffset, toOffset);
    if (!range) return;
    const next = toggleLineRange(highlightedLines, range.fromLine, range.toLine);
    updateAttributes({ highlightedLines: next });
  }

  return (
    <NodeViewWrapper className="code-block-wrapper">
      <div className="code-block-toolbar" contentEditable={false} suppressContentEditableWarning>
        <input
          type="text"
          className="code-block-filename-input"
          placeholder="filename.ext (optional)"
          aria-label="Code block filename"
          value={localFilename}
          onChange={(e) => setLocalFilename(e.target.value)}
          onBlur={() => updateAttributes({ filename: localFilename.trim() || null })}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              (e.target as HTMLInputElement).blur();
            } else if (e.key === "Escape") {
              setLocalFilename(filename ?? "");
              (e.target as HTMLInputElement).blur();
            }
          }}
        />
        <div className="code-block-toolbar-right">
          {highlightedLines.length > 0 && (
            <span
              className="code-block-highlight-count"
              aria-label={`${highlightedLines.length} highlighted line${highlightedLines.length === 1 ? "" : "s"}`}
            >
              {highlightedLines.length}
            </span>
          )}
          <button
            type="button"
            className="code-block-highlight-toggle"
            onClick={toggleHighlightForSelection}
            title="Toggle highlight on the current line(s)"
            aria-label="Toggle line highlight"
          >
            <Highlighter className="size-3.5" aria-hidden />
          </button>
          <select
            className="code-block-language-select"
            aria-label="Code block language"
            value={language ?? ""}
            onChange={(e) => updateAttributes({ language: e.target.value || null })}
          >
            <option value="">auto</option>
            {languages.map((lang) => (
              <option key={lang} value={lang}>
                {lang}
              </option>
            ))}
          </select>
        </div>
      </div>
      <pre>
        {/* `as` accepts any tag at runtime but tiptap's types narrow it to "div".
            We need <code> so the highlight CSS targets the right element. */}
        <NodeViewContent
          as={"code" as "div"}
          className={language ? `language-${language}` : undefined}
        />
      </pre>
    </NodeViewWrapper>
  );
}
