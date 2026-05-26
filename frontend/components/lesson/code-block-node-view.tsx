"use client";

import { NodeViewContent, NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { useEffect, useMemo, useState } from "react";

// React NodeView for code blocks in the editor. Replaces the default ProseMirror
// rendering with a toolbar (filename input + language dropdown) above the
// editable code area. The toolbar is contentEditable=false so creators can't
// accidentally type into it. Server-side rendering uses extension.renderHTML
// instead — see lib/code-highlight.ts for the matching display chip.
export function CodeBlockNodeView({ node, updateAttributes, extension }: NodeViewProps) {
  const language: string | null = node.attrs.language ?? null;
  const filename: string | null = node.attrs.filename ?? null;

  // Filename is committed on blur rather than per-keystroke — every transaction
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
            // Enter commits + blurs; Escape reverts.
            if (e.key === "Enter") {
              e.preventDefault();
              (e.target as HTMLInputElement).blur();
            } else if (e.key === "Escape") {
              setLocalFilename(filename ?? "");
              (e.target as HTMLInputElement).blur();
            }
          }}
        />
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
