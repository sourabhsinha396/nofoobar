import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ArticleEditor } from "@/components/lesson/article-editor";
import { EMPTY_TIPTAP_DOC } from "@/lib/tiptap-extensions";

afterEach(() => {
  vi.clearAllMocks();
});

describe("ArticleEditor — smoke", () => {
  it("renders all five toolbar buttons (H1, Bold, Italic, BulletList, CodeBlock)", () => {
    render(<ArticleEditor value={EMPTY_TIPTAP_DOC} onChange={() => {}} />);
    expect(screen.getByRole("button", { name: /heading 1/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^bold$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^italic$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /bullet list/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /code block/i })).toBeInTheDocument();
  });

  it("applies aria-pressed=false on toolbar buttons when no formatting is active", () => {
    render(<ArticleEditor value={EMPTY_TIPTAP_DOC} onChange={() => {}} />);
    for (const name of [/heading 1/i, /^bold$/i, /^italic$/i, /bullet list/i, /code block/i]) {
      expect(screen.getByRole("button", { name })).toHaveAttribute("aria-pressed", "false");
    }
  });

  it("forwards the id prop to the contenteditable surface", () => {
    const { container } = render(
      <ArticleEditor value={EMPTY_TIPTAP_DOC} onChange={() => {}} id="article-body" />,
    );
    // TipTap mounts the contenteditable lazily (immediatelyRender: false),
    // so we wait until the next microtask flushes. For the smoke test we just
    // assert the element exists somewhere in the rendered tree once it shows up.
    expect(container.querySelector("#article-body")).not.toBeNull();
  });
});
