import { describe, expect, it } from "vitest";

import { highlightCodeBlocks, wrapLines } from "@/lib/code-highlight";

describe("highlightCodeBlocks", () => {
  it("leaves non-code markup untouched", () => {
    const html = "<p>Hello <strong>world</strong></p>";
    expect(highlightCodeBlocks(html)).toBe(html);
  });

  it("adds hljs class and highlights tokens for language-tagged blocks", () => {
    const input =
      '<pre><code class="language-python">def foo():\n    return 42</code></pre>';
    const out = highlightCodeBlocks(input);
    expect(out).toContain('class="hljs language-python"');
    expect(out).toMatch(/<span class="hljs-keyword">def<\/span>/);
    expect(out).toMatch(/<span class="hljs-number">42<\/span>/);
  });

  it("decodes HTML entities before highlighting", () => {
    const input =
      '<pre><code class="language-javascript">const ok = a &lt; b;</code></pre>';
    const out = highlightCodeBlocks(input);
    expect(out).toContain('class="hljs language-javascript"');
    expect(out).toMatch(/<span class="hljs-keyword">const<\/span>/);
    expect(out).toContain("&#x3C;");
  });

  it("falls back to autodetection when no language class is set", () => {
    const input = "<pre><code>def foo(): return 42</code></pre>";
    const out = highlightCodeBlocks(input);
    expect(out).toMatch(/class="hljs"/);
  });

  it("handles unknown languages by autodetecting (and preserves the class)", () => {
    const input =
      '<pre><code class="language-zaphod">def foo():\n    return 42</code></pre>';
    const out = highlightCodeBlocks(input);
    expect(out).toContain("language-zaphod");
    expect(out).toMatch(/class="hljs language-zaphod"/);
    expect(out).toMatch(/<span class="hljs-/);
  });

  it("highlights multiple code blocks in one document independently", () => {
    const input =
      "<p>First</p>" +
      '<pre><code class="language-python">print(1)</code></pre>' +
      "<p>Second</p>" +
      '<pre><code class="language-javascript">console.log(2)</code></pre>';
    const out = highlightCodeBlocks(input);
    expect(out).toContain("language-python");
    expect(out).toContain("language-javascript");
    expect((out.match(/<span class="hljs-/g) || []).length).toBeGreaterThanOrEqual(2);
  });

  it("matches tiptap-generated output that puts hljs class on <pre>", () => {
    const input =
      '<pre class="hljs"><code class="language-python">def foo(): return 42</code></pre>';
    const out = highlightCodeBlocks(input);
    expect(out).toMatch(/<span class="hljs-keyword">def<\/span>/);
    expect(out).toMatch(/<span class="hljs-number">42<\/span>/);
  });

  it("emits a filename header chip with file icon when data-filename is present", () => {
    const input =
      '<pre class="hljs" data-filename="app.py"><code class="language-python">x = 1</code></pre>';
    const out = highlightCodeBlocks(input);
    expect(out).toContain('class="code-block-header"');
    expect(out).toContain('<span class="code-block-filename">app.py</span>');
    expect(out).toContain('class="code-block-header-icon"');
    expect(out.indexOf("code-block-header")).toBeLessThan(out.indexOf("<pre>"));
  });

  it("omits the header chip when no filename is set", () => {
    const input = '<pre class="hljs"><code class="language-python">x = 1</code></pre>';
    const out = highlightCodeBlocks(input);
    expect(out).not.toContain("code-block-header");
  });

  it("escapes HTML-sensitive characters in the filename", () => {
    const input =
      '<pre class="hljs" data-filename="&lt;evil&gt;.py"><code class="language-python">x</code></pre>';
    const out = highlightCodeBlocks(input);
    expect(out).toContain("&lt;evil&gt;.py");
    expect(out).not.toContain("<evil>.py");
  });

  it("wraps each block in a copy-button wrapper", () => {
    const input = '<pre><code class="language-python">x = 1</code></pre>';
    const out = highlightCodeBlocks(input);
    expect(out).toContain('class="code-block-wrapper"');
    expect(out).toContain("data-copy-code");
    expect(out).toContain('aria-label="Copy code"');
    const preIdx = out.indexOf("<pre>");
    const btnIdx = out.indexOf("<button");
    expect(preIdx).toBeGreaterThan(-1);
    expect(btnIdx).toBeGreaterThan(preIdx);
  });

  it("preserves surrounding markup", () => {
    const input =
      '<h2>Example</h2><pre><code class="language-python">x = 1</code></pre><p>Done.</p>';
    const out = highlightCodeBlocks(input);
    expect(out.startsWith("<h2>Example</h2>")).toBe(true);
    expect(out.endsWith("<p>Done.</p>")).toBe(true);
  });

  it("wraps every source line in <span class='line'>", () => {
    const input =
      '<pre class="hljs"><code class="language-python">a = 1\nb = 2\nc = 3</code></pre>';
    const out = highlightCodeBlocks(input);
    // Three lines, three line wrappers.
    expect((out.match(/<span class="line"/g) ?? []).length).toBe(3);
  });

  it("marks lines listed in data-highlighted-lines as highlighted", () => {
    const input =
      '<pre class="hljs" data-highlighted-lines="2"><code class="language-python">a = 1\nb = 2\nc = 3</code></pre>';
    const out = highlightCodeBlocks(input);
    // Only the second line carries the data-highlighted attribute.
    const highlightedHits = out.match(/data-highlighted="true"/g) ?? [];
    expect(highlightedHits.length).toBe(1);
    // And it's on the line containing `b = 2`, not the others.
    const secondLineRegex =
      /<span class="line" data-highlighted="true">[\s\S]*?b[\s\S]*?2[\s\S]*?<\/span>/;
    expect(out).toMatch(secondLineRegex);
  });

  it("handles a comma-separated multi-line highlight list", () => {
    const input =
      '<pre class="hljs" data-highlighted-lines="1,3"><code class="language-python">a = 1\nb = 2\nc = 3</code></pre>';
    const out = highlightCodeBlocks(input);
    expect((out.match(/data-highlighted="true"/g) ?? []).length).toBe(2);
  });

  it("ignores empty / malformed entries in data-highlighted-lines", () => {
    const input =
      '<pre class="hljs" data-highlighted-lines="0,,2,foo,4"><code>a\nb\nc\nd</code></pre>';
    const out = highlightCodeBlocks(input);
    // Lines 2 and 4 only (0/foo dropped, '' dropped). Two highlights.
    expect((out.match(/data-highlighted="true"/g) ?? []).length).toBe(2);
  });
});

// Direct hast-walker tests - these guarantee multi-line tokens (a real bug
// hazard if we'd done naive HTML splitting) clone correctly across lines.

function el(
  tagName: string,
  className: string,
  children: { type: "text" | "element"; value?: string; [k: string]: unknown }[],
) {
  return {
    type: "element" as const,
    tagName,
    properties: { className: [className] },
    children: children as never,
  };
}

describe("wrapLines (hast walker)", () => {
  it("splits a flat text node on newlines", () => {
    const tree = {
      type: "root" as const,
      children: [{ type: "text" as const, value: "a\nb\nc" }],
    };
    const out = wrapLines(tree, new Set());
    // 3 line spans, no separator text nodes (CSS .line { display: block }
    // produces visual line breaks; \n separators would double them).
    expect(out.children.length).toBe(3);
    const lineSpans = out.children.filter(
      (c) => c.type === "element" && c.tagName === "span",
    );
    expect(lineSpans).toHaveLength(3);
    // Sanity: no text-node siblings between spans.
    const textSiblings = out.children.filter((c) => c.type === "text");
    expect(textSiblings).toHaveLength(0);
  });

  it("clones a multi-line token across each line it touches", () => {
    // Models a multi-line string token: <span class="hljs-string">"hello\nworld"</span>
    const tree = {
      type: "root" as const,
      children: [
        el("span", "hljs-string", [
          { type: "text", value: '"hello\nworld"' },
        ]),
      ],
    };
    const out = wrapLines(tree, new Set());
    // Two source lines → two line spans, each containing its own hljs-string
    // clone with the correct slice of text.
    const lineSpans = out.children.filter(
      (c) => c.type === "element" && c.tagName === "span",
    );
    expect(lineSpans).toHaveLength(2);
    // Each line span has one child: the cloned hljs-string element.
    for (const ls of lineSpans) {
      if (ls.type !== "element") continue;
      expect(ls.children).toHaveLength(1);
      const inner = ls.children[0];
      expect(inner.type).toBe("element");
      if (inner.type === "element") {
        expect((inner.properties?.className as string[])[0]).toBe("hljs-string");
      }
    }
  });

  it("marks the requested 1-indexed lines as highlighted", () => {
    const tree = {
      type: "root" as const,
      children: [{ type: "text" as const, value: "a\nb\nc" }],
    };
    const out = wrapLines(tree, new Set([2]));
    const lineSpans = out.children.filter(
      (c) => c.type === "element" && c.tagName === "span",
    );
    expect(lineSpans).toHaveLength(3);
    const flags = lineSpans.map((ls) =>
      ls.type === "element" ? Boolean(ls.properties?.dataHighlighted) : false,
    );
    expect(flags).toEqual([false, true, false]);
  });

  it("preserves deliberate empty lines as empty .line spans", () => {
    // "a\n\nb" - two source lines with a blank line between them.
    const tree = {
      type: "root" as const,
      children: [{ type: "text" as const, value: "a\n\nb" }],
    };
    const out = wrapLines(tree, new Set());
    const lineSpans = out.children.filter(
      (c) => c.type === "element" && c.tagName === "span",
    );
    expect(lineSpans).toHaveLength(3);
    // Middle span exists but has no children - CSS min-height keeps it visible.
    const middle = lineSpans[1];
    if (middle.type === "element") {
      expect(middle.children).toEqual([]);
    }
  });

  it("drops a trailing empty line caused by source ending in \\n", () => {
    const tree = {
      type: "root" as const,
      children: [{ type: "text" as const, value: "a\nb\n" }],
    };
    const out = wrapLines(tree, new Set());
    const lineSpans = out.children.filter(
      (c) => c.type === "element" && c.tagName === "span",
    );
    expect(lineSpans).toHaveLength(2);
  });
});
